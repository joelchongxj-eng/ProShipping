from pathlib import PurePosixPath
from typing import Protocol

import httpx
from pypdf.errors import PdfReadError

from app.models import (
    CaseStatus,
    DocumentPairResult,
    ExtractedField,
    FieldStatus,
    ReviewReason,
    ShippingFields,
    SourceLocation,
)
from app.services.ai_models import DocumentType, ExtractedDocument
from app.services.ai_service import AIResponseError, GroqRequestError
from app.services.comparison import compare_documents
from app.services.document_reader import (
    DocumentContent,
    DocumentReadError,
    read_document,
)
from app.services.document_text import (
    DocumentReadError as VisionDocumentReadError,
    attachment_text_with_vision,
)
from app.services.text_extractor import extract_shipping_fields


WRONG_DOCUMENT_TITLES = {
    "commercial invoice",
    "packing list",
    "certificate of origin",
}
WRONG_DOCUMENT_DISCLAIMERS = (
    "not an si or bl",
    "packing list only",
)


class AIDocumentService(Protocol):
    async def transcribe_image(self, image: bytes, mime_type: str) -> str: ...

    async def extract_text(self, text: str, filename: str) -> ExtractedDocument: ...


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


def _has_missing_fields(fields: ShippingFields) -> bool:
    return any(value is None for _, value in fields)


def _with_ai_source(
    fields: ShippingFields,
    filename: str,
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
                    page=None,
                    evidence_text=field.evidence,
                    locator=None,
                )
            }
        )
    return ShippingFields(**sourced)


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


async def _read_with_pdf_fallback(
    filename: str,
    content: bytes,
    ai_service: AIDocumentService,
) -> tuple[DocumentContent, bool]:
    try:
        return read_document(filename, content), False
    except DocumentReadError:
        if PurePosixPath(filename).suffix.casefold() != ".pdf":
            raise
    transcript = await attachment_text_with_vision(content, filename, ai_service)
    return DocumentContent(text=transcript), True


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
    ai_fields = _with_ai_source(extracted.fields, filename)
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
) -> DocumentPairResult:
    if ai_service is None:
        return compare_document_pair(
            si_filename,
            si_content,
            bl_filename,
            bl_content,
        )

    try:
        si_document, si_used_ai = await _read_with_pdf_fallback(
            si_filename,
            si_content,
            ai_service,
        )
        bl_document, bl_used_ai = await _read_with_pdf_fallback(
            bl_filename,
            bl_content,
            ai_service,
        )
        if is_wrong_document_type(si_document.text) or is_wrong_document_type(
            bl_document.text
        ):
            return _wrong_document_result()

        si_fields = _extract_fields(si_filename, si_document)
        bl_fields = _extract_fields(bl_filename, bl_document)
        if si_used_ai:
            si_fields, wrong_type = await _complete_scanned_fields(
                si_filename,
                si_document,
                si_fields,
                DocumentType.SI,
                ai_service,
            )
            if wrong_type:
                return _wrong_document_result()
        if bl_used_ai:
            bl_fields, wrong_type = await _complete_scanned_fields(
                bl_filename,
                bl_document,
                bl_fields,
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

    return _compare_fields(si_fields, bl_fields)
