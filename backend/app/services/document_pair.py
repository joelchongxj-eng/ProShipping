from pathlib import PurePosixPath
from typing import Protocol

import httpx
from pypdf.errors import PdfReadError

from app.models import (
    CaseStatus,
    ComparisonMethod,
    DocumentPairResult,
    ExtractedField,
    FieldComparison,
    FieldStatus,
    ReviewReason,
    ShippingFields,
    SourceLocation,
)
from app.services.ai_models import (
    DocumentType,
    ExtractedDocument,
    SemanticDecision,
    SemanticEquivalenceResult,
)
from app.services.ai_service import AIResponseError, GroqRequestError
from app.services.comparison import compare_documents
from app.services.document_reader import (
    DocumentContent,
    DocumentPage,
    DocumentReadError,
    read_document,
)
from app.services.document_text import (
    DocumentReadError as VisionDocumentReadError,
    rendered_pdf_document_with_vision,
)
from app.services.text_extractor import extract_shipping_fields
from app.services.semantic_equivalence import SEMANTIC_TEXT_FIELDS


WRONG_DOCUMENT_TITLES = {
    "commercial invoice",
    "packing list",
    "certificate of origin",
}
WRONG_DOCUMENT_DISCLAIMERS = (
    "not an si or bl",
    "packing list only",
)

EXPECTED_AI_FAILURES = (
    AIResponseError,
    GroqRequestError,
    VisionDocumentReadError,
    httpx.HTTPError,
    TimeoutError,
)


class AIDocumentService(Protocol):
    async def transcribe_image(self, image: bytes, mime_type: str) -> str: ...

    async def extract_text(self, text: str, filename: str) -> ExtractedDocument: ...


class SemanticAIService(Protocol):
    async def compare_semantic(
        self,
        field: str,
        si_value: str,
        bl_value: str,
    ) -> SemanticEquivalenceResult: ...


def is_wrong_document_type(text: str) -> bool:
    lines = [line.strip().casefold() for line in text.splitlines() if line.strip()]
    if lines and lines[0] in WRONG_DOCUMENT_TITLES:
        return True
    combined = "\n".join(lines)
    return any(marker in combined for marker in WRONG_DOCUMENT_DISCLAIMERS)


def _unreadable_result() -> DocumentPairResult:
    return DocumentPairResult(
        status=CaseStatus.NEEDS_REVIEW,
        review_reason=ReviewReason.UNREADABLE,
    )


def _wrong_document_result() -> DocumentPairResult:
    return DocumentPairResult(
        status=CaseStatus.NEEDS_REVIEW,
        review_reason=ReviewReason.WRONG_DOC_TYPE,
    )


def _extract_fields(filename: str, document: DocumentContent) -> ShippingFields:
    return extract_shipping_fields(
        document.text,
        source_filename=filename,
        source_pages=document.pages,
        source_lines=document.source_lines,
    )


def _compare_fields(
    si_fields: ShippingFields,
    bl_fields: ShippingFields,
) -> DocumentPairResult:
    comparison = compare_documents(si_fields, bl_fields)
    review_reason = None
    if any(item.status is FieldStatus.MISSING for item in comparison.fields):
        review_reason = ReviewReason.MISSING_VALUE
    return DocumentPairResult(
        status=comparison.status,
        si_fields=si_fields,
        bl_fields=bl_fields,
        comparison=comparison.fields,
        review_reason=review_reason,
    )


def _status_for_fields(fields: list[FieldComparison]) -> CaseStatus:
    statuses = {item.status for item in fields}
    if FieldStatus.MISMATCH in statuses:
        return CaseStatus.MISMATCH
    if FieldStatus.MISSING in statuses or FieldStatus.NEEDS_REVIEW in statuses:
        return CaseStatus.NEEDS_REVIEW
    return CaseStatus.MATCH


async def _resolve_semantic_mismatches(
    result: DocumentPairResult,
    semantic_ai_service: SemanticAIService | None,
) -> DocumentPairResult:
    if semantic_ai_service is None or not result.comparison:
        return result
    resolved = list(result.comparison)
    for index, item in enumerate(resolved):
        if (
            item.status is not FieldStatus.MISMATCH
            or item.field not in SEMANTIC_TEXT_FIELDS
            or item.si is None
            or item.bl is None
        ):
            continue
        try:
            decision = await semantic_ai_service.compare_semantic(
                item.field,
                item.si.raw_value,
                item.bl.raw_value,
            )
        except (AIResponseError, GroqRequestError, httpx.HTTPError, TimeoutError):
            continue
        if decision.decision is SemanticDecision.EQUIVALENT:
            resolved[index] = item.model_copy(
                update={
                    "status": FieldStatus.MATCH,
                    "reason": decision.reason,
                    "comparison_method": ComparisonMethod.SEMANTIC_AI,
                    "equivalence_reason": decision.reason,
                }
            )
        elif decision.decision is SemanticDecision.DIFFERENT:
            resolved[index] = item.model_copy(
                update={
                    "reason": decision.reason,
                    "comparison_method": ComparisonMethod.SEMANTIC_AI,
                    "equivalence_reason": None,
                }
            )
    return result.model_copy(
        update={
            "status": _status_for_fields(resolved),
            "comparison": resolved,
        }
    )


def _has_missing_fields(fields: ShippingFields) -> bool:
    return any(value is None for _, value in fields)


def _has_extracted_fields(fields: ShippingFields) -> bool:
    return any(value is not None for _, value in fields)


def _with_ai_source(
    fields: ShippingFields,
    filename: str,
    pages: tuple[DocumentPage, ...] = (),
) -> ShippingFields:
    sourced: dict[str, ExtractedField | None] = {}
    for name, field in fields:
        if field is None or field.source is not None:
            sourced[name] = field
            continue
        sourced[name] = field.model_copy(
            update={
                "source": SourceLocation(
                    filename=filename,
                    page=_page_for_evidence(field.evidence, pages),
                    evidence_text=field.evidence,
                    locator=None,
                )
            }
        )
    return ShippingFields(**sourced)


def _page_for_evidence(
    evidence: str,
    pages: tuple[DocumentPage, ...],
) -> int | None:
    matching_pages = {
        page.number
        for page in pages
        if evidence in page.text
    }
    return matching_pages.pop() if len(matching_pages) == 1 else None


def _merge_missing_fields(
    deterministic: ShippingFields,
    ai_fields: ShippingFields,
) -> ShippingFields:
    return ShippingFields(
        **{
            name: deterministic_field or getattr(ai_fields, name)
            for name, deterministic_field in deterministic
        }
    )


async def _extract_document_with_ai(
    filename: str,
    content: bytes,
    expected_type: DocumentType,
    ai_service: AIDocumentService,
) -> tuple[ShippingFields, bool]:
    try:
        document = read_document(filename, content)
    except DocumentReadError:
        if PurePosixPath(filename).suffix.casefold() != ".pdf":
            raise
        fields = ShippingFields()
    else:
        if is_wrong_document_type(document.text):
            return ShippingFields(), True
        fields = _extract_fields(filename, document)
        if (
            PurePosixPath(filename).suffix.casefold() != ".pdf"
            or not _has_missing_fields(fields)
        ):
            return fields, False

    try:
        vision_document = await rendered_pdf_document_with_vision(
            content,
            filename,
            ai_service,
        )
        if is_wrong_document_type(vision_document.text):
            return fields, True
        vision_fields = _extract_fields(filename, vision_document)
        fields = _merge_missing_fields(fields, vision_fields)
        if _has_missing_fields(fields):
            fields, wrong_type = await _complete_scanned_fields(
                filename,
                vision_document,
                fields,
                expected_type,
                ai_service,
            )
            if wrong_type:
                return fields, True
    except EXPECTED_AI_FAILURES:
        if _has_extracted_fields(fields):
            return fields, False
        raise
    return fields, False


async def _complete_scanned_fields(
    filename: str,
    document: DocumentContent,
    fields: ShippingFields,
    expected_type: DocumentType,
    ai_service: AIDocumentService,
) -> tuple[ShippingFields, bool]:
    if not _has_missing_fields(fields):
        return fields, False
    extracted = await ai_service.extract_text(document.text, filename)
    if extracted.document_type is not expected_type:
        return fields, True
    ai_fields = _with_ai_source(extracted.fields, filename, document.pages)
    return _merge_missing_fields(fields, ai_fields), False


def compare_document_pair(
    si_filename: str,
    si_content: bytes,
    bl_filename: str,
    bl_content: bytes,
) -> DocumentPairResult:
    try:
        si_document = read_document(si_filename, si_content)
        bl_document = read_document(bl_filename, bl_content)
        if is_wrong_document_type(si_document.text) or is_wrong_document_type(
            bl_document.text
        ):
            return _wrong_document_result()

        si_fields = _extract_fields(si_filename, si_document)
        bl_fields = _extract_fields(bl_filename, bl_document)
    except (DocumentReadError, UnicodeDecodeError, OSError):
        return _unreadable_result()
    return _compare_fields(si_fields, bl_fields)


async def compare_document_pair_with_ai_fallback(
    si_filename: str,
    si_content: bytes,
    bl_filename: str,
    bl_content: bytes,
    ai_service: AIDocumentService | None = None,
    semantic_ai_service: SemanticAIService | None = None,
) -> DocumentPairResult:
    if ai_service is None:
        return await _resolve_semantic_mismatches(
            compare_document_pair(
                si_filename,
                si_content,
                bl_filename,
                bl_content,
            ),
            semantic_ai_service,
        )

    try:
        si_fields, wrong_type = await _extract_document_with_ai(
            si_filename,
            si_content,
            DocumentType.SI,
            ai_service,
        )
        if wrong_type:
            return _wrong_document_result()
        bl_fields, wrong_type = await _extract_document_with_ai(
            bl_filename,
            bl_content,
            DocumentType.BL,
            ai_service,
        )
        if wrong_type:
            return _wrong_document_result()
    except (
        AIResponseError,
        DocumentReadError,
        GroqRequestError,
        PdfReadError,
        VisionDocumentReadError,
        UnicodeDecodeError,
        httpx.HTTPError,
        OSError,
    ):
        return _unreadable_result()

    return await _resolve_semantic_mismatches(
        _compare_fields(si_fields, bl_fields),
        semantic_ai_service,
    )
