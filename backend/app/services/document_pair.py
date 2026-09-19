from app.models import (
    CaseStatus,
    DocumentPairResult,
    FieldStatus,
    ReviewReason,
)
from app.services.comparison import compare_documents
from app.services.document_reader import DocumentReadError, read_document
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


def is_wrong_document_type(text: str) -> bool:
    lines = [line.strip().casefold() for line in text.splitlines() if line.strip()]
    if lines and lines[0] in WRONG_DOCUMENT_TITLES:
        return True
    combined = "\n".join(lines)
    return any(marker in combined for marker in WRONG_DOCUMENT_DISCLAIMERS)


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
            return DocumentPairResult(
                status=CaseStatus.NEEDS_REVIEW,
                review_reason=ReviewReason.WRONG_DOC_TYPE,
            )

        si_fields = extract_shipping_fields(
            si_document.text,
            source_filename=si_filename,
            source_pages=si_document.pages,
            source_lines=si_document.source_lines,
        )
        bl_fields = extract_shipping_fields(
            bl_document.text,
            source_filename=bl_filename,
            source_pages=bl_document.pages,
            source_lines=bl_document.source_lines,
        )
    except (DocumentReadError, UnicodeDecodeError, OSError):
        return DocumentPairResult(
            status=CaseStatus.NEEDS_REVIEW,
            review_reason=ReviewReason.UNREADABLE,
        )
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
