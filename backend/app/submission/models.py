from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import CaseStatus, ReviewReason
from app.reviews.models import ReviewTargetType, ShippingFieldName


class SubmissionChannel(StrEnum):
    SUPERVISOR = "SUPERVISOR"
    SENDER = "SENDER"


class SubmissionSectionStatus(StrEnum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UPDATE_REQUIRED = "UPDATE_REQUIRED"


class SubmissionDispatchType(StrEnum):
    INITIAL = "INITIAL"
    UPDATE = "UPDATE"
    RESEND = "RESEND"


class SubmissionDeliveryStatus(StrEnum):
    SENT = "SENT"
    FAILED = "FAILED"
    NOT_CONFIGURED = "NOT_CONFIGURED"


class SubmissionItem(BaseModel):
    target_type: ReviewTargetType
    target_id: str
    subject: str
    sender_email: str | None = None
    automated_status: CaseStatus
    review_reason: ReviewReason | None = None
    field: ShippingFieldName
    si_value: str | None = None
    bl_value: str | None = None
    reason: str
    source_review_id: UUID
    added_at: datetime


class SubmissionDeliveryOutcome(BaseModel):
    recipient: str | None = None
    status: SubmissionDeliveryStatus
    attempted_at: datetime
    error_reason: str | None = None


class SubmissionDispatch(BaseModel):
    dispatch_id: UUID
    channel: SubmissionChannel
    dispatch_type: SubmissionDispatchType
    created_at: datetime
    completed_at: datetime
    parent_dispatch_id: UUID | None = None
    item_snapshot: list[SubmissionItem] = Field(default_factory=list)
    added_target_ids: list[str] = Field(default_factory=list)
    removed_target_ids: list[str] = Field(default_factory=list)
    successful_snapshot_target_ids: list[str] = Field(default_factory=list)
    outcomes: list[SubmissionDeliveryOutcome] = Field(default_factory=list)


class SubmissionSection(BaseModel):
    status: SubmissionSectionStatus
    items: list[SubmissionItem] = Field(default_factory=list)
    added_since_last_send: int = 0
    removed_since_last_send: int = 0
    last_sent_at: datetime | None = None
    dispatches: list[SubmissionDispatch] = Field(default_factory=list)


class SubmissionWorkflowResponse(BaseModel):
    supervisor: SubmissionSection
    sender_follow_up: SubmissionSection
