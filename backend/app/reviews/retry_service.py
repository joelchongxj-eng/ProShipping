from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID

from app.models import (
    CaseRecord,
    ReviewReason,
    UploadComparisonResponse,
)
from app.reviews.hashing import automated_result_hash
from app.reviews.models import HumanReviewRecord, ReviewTargetType
from app.reviews.retry import (
    RetryAttempt,
    RetryAttemptHistory,
    RetryExecutionStatus,
    RetryExecutionStore,
)
from app.services.document_pair import (
    AIDocumentService,
    SemanticAIService,
    compare_document_pair_with_ai_fallback,
)
from app.services.processor import CaseProcessor
from app.services.upload_store import UploadSession


class RetryExecutionError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class RetryExecutionService:
    def __init__(
        self,
        store: RetryExecutionStore,
        *,
        processor: CaseProcessor,
        case_lookup: Callable[[str], CaseRecord | None],
        upload_session_lookup: Callable[[str], UploadSession | None],
        ai_service_lookup: Callable[[], AIDocumentService | None],
        semantic_ai_service_lookup: Callable[[], SemanticAIService | None] | None = None,
    ) -> None:
        self.store = store
        self.processor = processor
        self.case_lookup = case_lookup
        self.upload_session_lookup = upload_session_lookup
        self.ai_service_lookup = ai_service_lookup
        self.semantic_ai_service_lookup = semantic_ai_service_lookup or (lambda: None)
        self._registered_uploads: dict[str, UploadComparisonResponse] = {}

    def register_upload(self, response: UploadComparisonResponse) -> None:
        self._registered_uploads[response.comparison_id] = response.model_copy(deep=True)

    def registered_upload(self, target_id: str) -> UploadComparisonResponse | None:
        target = self._registered_uploads.get(target_id)
        return target.model_copy(deep=True) if target is not None else None

    def clear_registered_uploads(self) -> None:
        self._registered_uploads.clear()

    def history(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> RetryAttemptHistory:
        if not self._target_exists(target_type, target_id):
            raise RetryExecutionError(404, "Retry target not found.")
        return RetryAttemptHistory(
            target_type=target_type,
            target_id=target_id,
            attempts=self.store.list(target_type, target_id),
        )

    async def execute(self, review: HumanReviewRecord) -> RetryAttempt:
        pending = self.store.create_pending(
            target_type=review.target_type,
            target_id=review.target_id,
            requested_review_id=review.review_id,
            previous_automated_status=review.automated_status,
            previous_result_hash=review.automated_result_hash,
        )
        started_at = datetime.now(UTC)
        self.store.transition(
            pending.retry_id,
            execution_status=RetryExecutionStatus.RUNNING,
            started_at=started_at,
        )
        try:
            result = await self._rerun(review.target_type, review.target_id)
        except FileNotFoundError:
            return self._fail(
                pending.retry_id,
                started_at,
                "Uploaded source documents are no longer available.",
            )
        except Exception:
            return self._fail(
                pending.retry_id,
                started_at,
                "Retry execution failed safely.",
            )

        result_hash = automated_result_hash(result)
        if (
            result.review_reason is ReviewReason.UNREADABLE
            and result.si_fields is None
            and result.bl_fields is None
            and not result.comparison
        ):
            return self._fail(
                pending.retry_id,
                started_at,
                "Retry could not read the source documents.",
                result=result,
                result_hash=result_hash,
            )
        return self.store.transition(
            pending.retry_id,
            execution_status=RetryExecutionStatus.SUCCEEDED,
            started_at=started_at,
            completed_at=datetime.now(UTC),
            new_automated_status=result.status,
            new_result_hash=result_hash,
            new_automated_result=result,
        )

    async def _rerun(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> CaseRecord | UploadComparisonResponse:
        if target_type is ReviewTargetType.COMPETITION_CASE:
            original = self.case_lookup(target_id)
            if original is None:
                raise LookupError("Competition case is unavailable")
            return await self.processor.process_email(original.email.model_copy(deep=True))

        original = self.registered_upload(target_id)
        session = self.upload_session_lookup(target_id)
        if original is None:
            raise LookupError("Upload comparison is unavailable")
        if session is None:
            raise FileNotFoundError("Upload bytes expired")
        try:
            si_content = session.attachments["si"].path.read_bytes()
            bl_content = session.attachments["bl"].path.read_bytes()
        except (KeyError, OSError) as exc:
            raise FileNotFoundError("Upload bytes unavailable") from exc
        pair = await compare_document_pair_with_ai_fallback(
            original.si_file.source_filename,
            si_content,
            original.bl_file.source_filename,
            bl_content,
            self.ai_service_lookup(),
            self.semantic_ai_service_lookup(),
        )
        return UploadComparisonResponse(
            comparison_id=original.comparison_id,
            status=pair.status,
            review_reason=pair.review_reason,
            si_file=original.si_file.model_copy(deep=True),
            bl_file=original.bl_file.model_copy(deep=True),
            si_fields=pair.si_fields,
            bl_fields=pair.bl_fields,
            comparison=pair.comparison,
        )

    def _fail(
        self,
        retry_id: UUID,
        started_at: datetime,
        reason: str,
        *,
        result: CaseRecord | UploadComparisonResponse | None = None,
        result_hash: str | None = None,
    ) -> RetryAttempt:
        return self.store.transition(
            retry_id,
            execution_status=RetryExecutionStatus.FAILED,
            started_at=started_at,
            completed_at=datetime.now(UTC),
            new_automated_status=result.status if result is not None else None,
            new_result_hash=result_hash,
            error_reason=reason,
            new_automated_result=result,
        )

    def _target_exists(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> bool:
        if target_type is ReviewTargetType.COMPETITION_CASE:
            return self.case_lookup(target_id) is not None
        return target_id in self._registered_uploads
