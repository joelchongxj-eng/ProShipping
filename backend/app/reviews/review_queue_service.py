from collections.abc import Callable

from app.models import CaseRecord, CaseStatus
from app.reviews.escalation import EscalationStore
from app.reviews.models import HumanReviewStatus, ReviewTargetType
from app.reviews.retry import RetryExecutionStore
from app.reviews.review_queue import (
    HumanReviewQueueItem,
    HumanReviewQueueResponse,
)
from app.reviews.service import HumanReviewService


class HumanReviewQueueService:
    """Build a read-only queue from competition cases and existing reducers."""

    def __init__(
        self,
        *,
        case_list: Callable[[], list[CaseRecord]],
        review_service: HumanReviewService,
        retry_store: RetryExecutionStore,
        escalation_store: EscalationStore,
    ) -> None:
        self.case_list = case_list
        self.review_service = review_service
        self.retry_store = retry_store
        self.escalation_store = escalation_store

    def list(
        self,
        *,
        limit: int,
        offset: int,
        include_match: bool,
        search: str | None,
        automated_status: CaseStatus | None,
        human_review_status: HumanReviewStatus | None,
        is_escalated: bool | None,
        retry_requested: bool | None,
    ) -> HumanReviewQueueResponse:
        eligible_statuses = {CaseStatus.MISMATCH, CaseStatus.NEEDS_REVIEW}
        if include_match:
            eligible_statuses.add(CaseStatus.MATCH)

        items = [
            self._item(case)
            for case in self.case_list()
            if case.status in eligible_statuses
        ]
        needle = search.strip().casefold() if search else None
        if needle:
            items = [
                item
                for item in items
                if needle in item.email_id.casefold()
                or needle in item.subject.casefold()
                or needle in item.sender.casefold()
            ]
        if automated_status is not None:
            items = [
                item
                for item in items
                if item.automated_status is automated_status
            ]
        if human_review_status is not None:
            items = [
                item
                for item in items
                if item.human_review_status is human_review_status
            ]
        if is_escalated is not None:
            items = [item for item in items if item.is_escalated is is_escalated]
        if retry_requested is not None:
            items = [
                item
                for item in items
                if item.retry_requested is retry_requested
            ]

        items.sort(key=lambda item: item.email_id)
        total = len(items)
        return HumanReviewQueueResponse(
            total=total,
            offset=offset,
            limit=limit,
            items=items[offset : offset + limit],
        )

    def _item(self, case: CaseRecord) -> HumanReviewQueueItem:
        target_type = ReviewTargetType.COMPETITION_CASE
        target_id = case.email.email_id
        summary = self.review_service.summary(target_type, target_id)
        retries = self.retry_store.list(target_type, target_id)
        escalations = self.escalation_store.list(target_type, target_id)
        latest_review = summary.latest_review
        latest_retry = retries[-1] if retries else None
        latest_escalation = escalations[-1] if escalations else None
        return HumanReviewQueueItem(
            target_type=target_type,
            target_id=target_id,
            email_id=case.email.email_id,
            sender=case.email.sender,
            subject=case.email.subject,
            received_at=case.email.received_at,
            automated_status=case.status,
            review_reason=case.review_reason,
            human_review_status=summary.review_status,
            last_reviewed_at=(latest_review.created_at if latest_review else None),
            is_escalated=summary.is_escalated,
            active_escalation_reason=summary.escalation_reason,
            latest_email_delivery_status=(
                latest_escalation.delivery_status if latest_escalation else None
            ),
            retry_requested=(
                summary.review_status is HumanReviewStatus.RETRY_REQUESTED
            ),
            latest_retry_execution_status=(
                latest_retry.execution_status if latest_retry else None
            ),
            latest_retry_attempt_number=(
                latest_retry.attempt_number if latest_retry else None
            ),
            has_human_review=summary.review_count > 0,
            latest_review_action=(latest_review.action if latest_review else None),
            latest_review_id=(latest_review.review_id if latest_review else None),
        )
