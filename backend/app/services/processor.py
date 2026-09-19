import asyncio
import re
from pathlib import PurePosixPath

import httpx
from pypdf.errors import PdfReadError

from app.clients.inbox import InboxProtocol
from app.models import (
    CaseRecord,
    CaseStatus,
    EmailCategory,
    EmailRecord,
    FieldStatus,
    ReviewReason,
)
from app.services.ai_models import DocumentType
from app.services.ai_service import AIResponseError, AIService, GroqRequestError
from app.services.classifier import classify_email
from app.services.comparison import compare_documents
from app.services.document_text import DocumentReadError, attachment_text, attachment_text_with_vision
from app.services.text_extractor import extract_shipping_fields


def _find_attachment(attachments: list[str], token: str) -> str | None:
    for path in attachments:
        stem = PurePosixPath(path).stem
        if re.search(rf"(?:^|[_\-\s]){token}(?:$|[_\-\s])", stem, flags=re.IGNORECASE):
            return path
    return None


class CaseProcessor:
    def __init__(self, inbox: InboxProtocol, concurrency: int = 12, ai_service: AIService | None = None) -> None:
        self.inbox = inbox
        self._semaphore = asyncio.Semaphore(concurrency)
        self.ai_service = ai_service

    async def process_all(self) -> list[CaseRecord]:
        emails = await self.inbox.list_emails()
        return list(await asyncio.gather(*(self.process_email(email) for email in emails)))

    async def process_email(self, email: EmailRecord) -> CaseRecord:
        async with self._semaphore:
            if self.ai_service:
                try:
                    classification = await self.ai_service.classify(email)
                except (AIResponseError, GroqRequestError, httpx.HTTPError):
                    return CaseRecord(email=email, category=classify_email(email), status=CaseStatus.FAILED)
                category = classification.category
                if classification.uncertain:
                    return CaseRecord(email=email, category=category, status=CaseStatus.NEEDS_REVIEW)
            else:
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
            allowed = {".txt", ".pdf", ".docx", ".xlsx"} if self.ai_service else {".txt"}
            if PurePosixPath(si_path).suffix.casefold() not in allowed or PurePosixPath(bl_path).suffix.casefold() not in allowed:
                return CaseRecord(
                    email=email,
                    category=category,
                    status=CaseStatus.NEEDS_REVIEW,
                    si_attachment=si_path,
                    bl_attachment=bl_path,
                    review_reason=ReviewReason.UNREADABLE,
                )

            try:
                si_text, bl_text = await asyncio.gather(
                    self.inbox.get_attachment(si_path),
                    self.inbox.get_attachment(bl_path),
                )
                if self.ai_service:
                    si_text, bl_text = await asyncio.gather(
                        attachment_text_with_vision(si_text, si_path, self.ai_service),
                        attachment_text_with_vision(bl_text, bl_path, self.ai_service),
                    )
                    si_doc, bl_doc = await asyncio.gather(
                        self.ai_service.extract_text(si_text, si_path),
                        self.ai_service.extract_text(bl_text, bl_path),
                    )
                    if si_doc.document_type is not DocumentType.SI or bl_doc.document_type is not DocumentType.BL:
                        return CaseRecord(
                            email=email,
                            category=category,
                            status=CaseStatus.NEEDS_REVIEW,
                            si_attachment=si_path,
                            bl_attachment=bl_path,
                            review_reason=ReviewReason.WRONG_DOC_TYPE,
                        )
                    si_fields, bl_fields = si_doc.fields, bl_doc.fields
                else:
                    si_text = attachment_text(si_text, si_path)
                    bl_text = attachment_text(bl_text, bl_path)
                    si_fields = extract_shipping_fields(si_text)
                    bl_fields = extract_shipping_fields(bl_text)
            except (UnicodeDecodeError, OSError, PdfReadError, DocumentReadError):
                return CaseRecord(
                    email=email,
                    category=category,
                    status=CaseStatus.NEEDS_REVIEW,
                    si_attachment=si_path,
                    bl_attachment=bl_path,
                    review_reason=ReviewReason.UNREADABLE,
                )
            except (AIResponseError, GroqRequestError, httpx.HTTPError):
                return CaseRecord(
                    email=email,
                    category=category,
                    status=CaseStatus.FAILED,
                    si_attachment=si_path,
                    bl_attachment=bl_path,
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

