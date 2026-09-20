from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import CaseStatus, ReviewReason
from app.reviews.escalation import EscalationDeliveryStatus
from app.reviews.models import HumanReviewStatus, ReviewAction, ReviewTargetType
from app.reviews.retry import RetryExecutionStatus


class HumanReviewQueueItem(BaseModel):
    target_type: ReviewTargetType
    target_id: str
    email_id: str
    sender: str
    subject: str
    received_at: datetime | None = None
    automated_status: CaseStatus
    review_reason: ReviewReason | None = None
    human_review_status: HumanReviewStatus
    last_reviewed_at: datetime | None = None
    is_escalated: bool = False
    active_escalation_reason: str | None = None
    latest_email_delivery_status: EscalationDeliveryStatus | None = None
    retry_requested: bool = False
    latest_retry_execution_status: RetryExecutionStatus | None = None
    latest_retry_attempt_number: int | None = None
    has_human_review: bool = False
    latest_review_action: ReviewAction | None = None
    latest_review_id: UUID | None = None


class HumanReviewQueueResponse(BaseModel):
    total: int = Field(ge=0)
    offset: int = Field(ge=0)
    limit: int = Field(ge=1, le=100)
    items: list[HumanReviewQueueItem] = Field(default_factory=list)
