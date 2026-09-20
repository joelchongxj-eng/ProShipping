from fastapi import APIRouter, HTTPException

from app.reviews.models import (
    CreateHumanReviewRequest,
    HumanReviewHistory,
    HumanReviewRecord,
    HumanReviewSummary,
    ReviewAction,
    ReviewTargetType,
)
from app.reviews.retry import RetryAttemptHistory
from app.reviews.retry_service import RetryExecutionError, RetryExecutionService
from app.reviews.service import HumanReviewError, HumanReviewService


def create_review_router(
    service: HumanReviewService,
    retry_service: RetryExecutionService,
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

    return router
