import asyncio
import re
from pathlib import PurePosixPath

from app.clients.inbox import InboxProtocol
from app.models import (
    CaseRecord,
    CaseStatus,
    EmailCategory,
    EmailRecord,
    FieldStatus,
    ReviewReason,
)
from app.services.classifier import classify_email
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


def _find_attachment(attachments: list[str], token: str) -> str | None:
    for path in attachments:
        stem = PurePosixPath(path).stem
        if re.search(rf"(?:^|[_\-\s]){token}(?:$|[_\-\s])", stem, flags=re.IGNORECASE):
            return path
    return None


def _is_wrong_document_type(text: str) -> bool:
    lines = [line.strip().casefold() for line in text.splitlines() if line.strip()]
    if lines and lines[0] in WRONG_DOCUMENT_TITLES:
        return True
    combined = "\n".join(lines)
    return any(marker in combined for marker in WRONG_DOCUMENT_DISCLAIMERS)


class CaseProcessor:
    def __init__(self, inbox: InboxProtocol, concurrency: int = 12) -> None:
        self.inbox = inbox
        self._semaphore = asyncio.Semaphore(concurrency)

    async def process_all(self) -> list[CaseRecord]:
        emails = await self.inbox.list_emails()
        return list(await asyncio.gather(*(self.process_email(email) for email in emails)))

    async def process_email(self, email: EmailRecord) -> CaseRecord:
        async with self._semaphore:
            category = classify_email(email)
            if category is not EmailCategory.BL_COMPARISON:
                return CaseRecord(email=email, category=category, status=CaseStatus.MATCH)

            si_path = _find_attachment(email.attachments, "SI")
            bl_path = _find_attachment(email.attachments, "BL")
            if si_path is None or bl_path is None:
                return CaseRecord(
                    email=email,
                    category=category,
                    status=CaseStatus.NEEDS_REVIEW,
                    si_attachment=si_path,
                    bl_attachment=bl_path,
                    review_reason=ReviewReason.MISSING_ATTACHMENT,
                )
            try:
                si_content, bl_content = await asyncio.gather(
                    self.inbox.get_attachment(si_path),
                    self.inbox.get_attachment(bl_path),
                )
                si_document = read_document(si_path, si_content)
                bl_document = read_document(bl_path, bl_content)
                if _is_wrong_document_type(si_document.text) or _is_wrong_document_type(bl_document.text):
                    return CaseRecord(
                        email=email,
                        category=category,
                        status=CaseStatus.NEEDS_REVIEW,
                        si_attachment=si_path,
                        bl_attachment=bl_path,
                        review_reason=ReviewReason.WRONG_DOC_TYPE,
                    )
                si_fields = extract_shipping_fields(
                    si_document.text,
                    source_filename=si_path,
                    source_pages=si_document.pages,
                    source_lines=si_document.source_lines,
                )
                bl_fields = extract_shipping_fields(
                    bl_document.text,
                    source_filename=bl_path,
                    source_pages=bl_document.pages,
                    source_lines=bl_document.source_lines,
                )
            except (DocumentReadError, UnicodeDecodeError, OSError):
                return CaseRecord(
                    email=email,
                    category=category,
                    status=CaseStatus.NEEDS_REVIEW,
                    si_attachment=si_path,
                    bl_attachment=bl_path,
                    review_reason=ReviewReason.UNREADABLE,
                )

            result = compare_documents(si_fields, bl_fields)
            review_reason = None
            if any(item.status is FieldStatus.MISSING for item in result.fields):
                review_reason = ReviewReason.MISSING_VALUE
            return CaseRecord(
                email=email,
                category=category,
                status=result.status,
                si_attachment=si_path,
                bl_attachment=bl_path,
                si_fields=si_fields,
                bl_fields=bl_fields,
                comparison=result.fields,
                review_reason=review_reason,
            )
