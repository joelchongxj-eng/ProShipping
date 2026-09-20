import asyncio
import re
from pathlib import PurePosixPath

from app.clients.inbox import InboxProtocol
from app.models import (
    CaseRecord,
    CaseStatus,
    EmailCategory,
    EmailRecord,
    ReviewReason,
)
from app.services.classifier import classify_email
from app.services.document_pair import (
    AIDocumentService,
    SemanticAIService,
    compare_document_pair_with_ai_fallback,
)


def _find_attachment(attachments: list[str], token: str) -> str | None:
    for path in attachments:
        stem = PurePosixPath(path).stem
        if re.search(rf"(?:^|[_\-\s]){token}(?:$|[_\-\s])", stem, flags=re.IGNORECASE):
            return path
    return None


class CaseProcessor:
    def __init__(
        self,
        inbox: InboxProtocol,
        concurrency: int = 12,
        ai_service: AIDocumentService | None = None,
        semantic_ai_service: SemanticAIService | None = None,
    ) -> None:
        self.inbox = inbox
        self._semaphore = asyncio.Semaphore(concurrency)
        self.ai_service = ai_service
        self.semantic_ai_service = semantic_ai_service

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
            si_content, bl_content = await asyncio.gather(
                self.inbox.get_attachment(si_path),
                self.inbox.get_attachment(bl_path),
            )
            result = await compare_document_pair_with_ai_fallback(
                si_path,
                si_content,
                bl_path,
                bl_content,
                self.ai_service,
                self.semantic_ai_service,
            )
            return CaseRecord(
                email=email,
                category=category,
                status=result.status,
                si_attachment=si_path,
                bl_attachment=bl_path,
                si_fields=result.si_fields,
                bl_fields=result.bl_fields,
                comparison=result.comparison,
                review_reason=result.review_reason,
            )
