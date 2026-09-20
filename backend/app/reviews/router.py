from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.models import CaseStatus
from app.reviews.escalation import (
    EscalationAssignment,
    EscalationAssignmentHistory,
)
from app.reviews.escalation_service import EscalationError, EscalationService
from app.reviews.models import (
    CreateHumanReviewRequest,
    HumanReviewHistory,
    HumanReviewRecord,
    HumanReviewStatus,
    HumanReviewSummary,
    ReviewAction,
    ReviewTargetType,
)
from app.reviews.retry import RetryAttemptHistory
from app.reviews.retry_service import RetryExecutionError, RetryExecutionService
from app.reviews.review_queue import HumanReviewQueueResponse
from app.reviews.review_queue_service import HumanReviewQueueService
from app.reviews.service import HumanReviewError, HumanReviewService


def create_review_router(
    service: HumanReviewService,
    retry_service: RetryExecutionService,
    escalation_service: EscalationService,
    queue_service: HumanReviewQueueService,
) -> APIRouter:
    router = APIRouter()

    async def create_review(
        target_type: ReviewTargetType,
        target_id: str,
        request: CreateHumanReviewRequest,
    ) -> HumanReviewRecord:
        try:
            review = service.create(target_type, target_id, request)
        except HumanReviewError as exc:
            raise HTTPException(exc.status_code, exc.detail) from exc
        if request.action is ReviewAction.RETRY:
            await retry_service.execute(review)
        if request.action is ReviewAction.ESCALATE:
            await escalation_service.create(review, request)
        return review

    def get_history(
        target_type: ReviewTargetType,
        target_id: str,
    ) -> HumanReviewHistory:
        try:
            return service.history(target_type, target_id)
        except HumanReviewError as exc:
            raise HTTPException(exc.status_code, exc.detail) from exc

    def get_summary(
        target_type: ReviewTargetType,
        target_id: str,
    ) -> HumanReviewSummary:
        try:
            return service.summary(target_type, target_id)
        except HumanReviewError as exc:
            raise HTTPException(exc.status_code, exc.detail) from exc

    def get_retry_attempts(
        target_type: ReviewTargetType,
        target_id: str,
    ) -> RetryAttemptHistory:
        try:
            return retry_service.history(target_type, target_id)
        except RetryExecutionError as exc:
            raise HTTPException(exc.status_code, exc.detail) from exc

    def get_escalations(
        target_type: ReviewTargetType,
        target_id: str,
    ) -> EscalationAssignmentHistory:
        return escalation_service.history(target_type, target_id)

    @router.post(
        "/api/cases/{target_id}/reviews",
        response_model=HumanReviewRecord,
        status_code=201,
    )
    async def create_case_review(
        target_id: str,
        request: CreateHumanReviewRequest,
    ) -> HumanReviewRecord:
        return await create_review(
            ReviewTargetType.COMPETITION_CASE,
            target_id,
            request,
        )

    @router.get(
        "/api/cases/{target_id}/reviews",
        response_model=HumanReviewHistory,
    )
    def get_case_reviews(target_id: str) -> HumanReviewHistory:
        return get_history(ReviewTargetType.COMPETITION_CASE, target_id)

    @router.get(
        "/api/cases/{target_id}/review-summary",
        response_model=HumanReviewSummary,
    )
    def get_case_review_summary(target_id: str) -> HumanReviewSummary:
        return get_summary(ReviewTargetType.COMPETITION_CASE, target_id)

    @router.get(
        "/api/cases/{target_id}/retry-attempts",
        response_model=RetryAttemptHistory,
    )
    def get_case_retry_attempts(target_id: str) -> RetryAttemptHistory:
        return get_retry_attempts(ReviewTargetType.COMPETITION_CASE, target_id)

    @router.get(
        "/api/cases/{target_id}/escalations",
        response_model=EscalationAssignmentHistory,
    )
    def get_case_escalations(target_id: str) -> EscalationAssignmentHistory:
        return get_escalations(ReviewTargetType.COMPETITION_CASE, target_id)

    @router.post(
        "/api/upload-comparisons/{target_id}/reviews",
        response_model=HumanReviewRecord,
        status_code=201,
    )
    async def create_upload_review(
        target_id: str,
        request: CreateHumanReviewRequest,
    ) -> HumanReviewRecord:
        return await create_review(
            ReviewTargetType.UPLOAD_COMPARISON,
            target_id,
            request,
        )

    @router.get(
        "/api/upload-comparisons/{target_id}/reviews",
        response_model=HumanReviewHistory,
    )
    def get_upload_reviews(target_id: str) -> HumanReviewHistory:
        return get_history(ReviewTargetType.UPLOAD_COMPARISON, target_id)

    @router.get(
        "/api/upload-comparisons/{target_id}/review-summary",
        response_model=HumanReviewSummary,
    )
    def get_upload_review_summary(target_id: str) -> HumanReviewSummary:
        return get_summary(ReviewTargetType.UPLOAD_COMPARISON, target_id)

    @router.get(
        "/api/upload-comparisons/{target_id}/retry-attempts",
        response_model=RetryAttemptHistory,
    )
    def get_upload_retry_attempts(target_id: str) -> RetryAttemptHistory:
        return get_retry_attempts(ReviewTargetType.UPLOAD_COMPARISON, target_id)

    @router.get(
        "/api/upload-comparisons/{target_id}/escalations",
        response_model=EscalationAssignmentHistory,
    )
    def get_upload_escalations(target_id: str) -> EscalationAssignmentHistory:
        return get_escalations(ReviewTargetType.UPLOAD_COMPARISON, target_id)

    @router.post(
        "/api/escalations/{assignment_id}/resend",
        response_model=EscalationAssignment,
    )
    async def resend_escalation(assignment_id: UUID) -> EscalationAssignment:
        try:
            return await escalation_service.resend(assignment_id)
        except EscalationError as exc:
            raise HTTPException(exc.status_code, exc.detail) from exc

    @router.get(
        "/api/review-queue",
        response_model=HumanReviewQueueResponse,
    )
    def get_review_queue(
        limit: int = Query(default=50, ge=1, le=100),
        offset: int = Query(default=0, ge=0),
        include_match: bool = False,
        search: str | None = None,
        automated_status: CaseStatus | None = None,
        human_review_status: HumanReviewStatus | None = None,
        is_escalated: bool | None = None,
        retry_requested: bool | None = None,
    ) -> HumanReviewQueueResponse:
        return queue_service.list(
            limit=limit,
            offset=offset,
            include_match=include_match,
            search=search,
            automated_status=automated_status,
            human_review_status=human_review_status,
            is_escalated=is_escalated,
            retry_requested=retry_requested,
        )

    return router
