from fastapi import APIRouter, HTTPException

from app.reviews.models import (
    CreateHumanReviewRequest,
    HumanReviewHistory,
    HumanReviewRecord,
    HumanReviewSummary,
    ReviewTargetType,
)
from app.reviews.service import HumanReviewError, HumanReviewService


def create_review_router(service: HumanReviewService) -> APIRouter:
    router = APIRouter()

    def create_review(
        target_type: ReviewTargetType,
        target_id: str,
        request: CreateHumanReviewRequest,
    ) -> HumanReviewRecord:
        try:
            return service.create(target_type, target_id, request)
        except HumanReviewError as exc:
            raise HTTPException(exc.status_code, exc.detail) from exc

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

    @router.post(
        "/api/cases/{target_id}/reviews",
        response_model=HumanReviewRecord,
        status_code=201,
    )
    def create_case_review(
        target_id: str,
        request: CreateHumanReviewRequest,
    ) -> HumanReviewRecord:
        return create_review(ReviewTargetType.COMPETITION_CASE, target_id, request)

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

    @router.post(
        "/api/upload-comparisons/{target_id}/reviews",
        response_model=HumanReviewRecord,
        status_code=201,
    )
    def create_upload_review(
        target_id: str,
        request: CreateHumanReviewRequest,
    ) -> HumanReviewRecord:
        return create_review(ReviewTargetType.UPLOAD_COMPARISON, target_id, request)

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

    return router
