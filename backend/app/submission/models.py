from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

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
    field: ShippingFieldName | None = None
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
    provider_message_id: str | None = None


class EmailDraftItemReference(BaseModel):
    target_type: ReviewTargetType
    target_id: str
    source_review_id: UUID


class EmailDraft(BaseModel):
    draft_id: UUID
    revision: int = Field(ge=1)
    channel: SubmissionChannel
    dispatch_type: SubmissionDispatchType
    route_recipient: str
    recipient: str
    subject: str
    body: str
    included_items: list[EmailDraftItemReference]
    created_at: datetime
    updated_at: datetime


class SenderEmailDrafts(BaseModel):
    drafts: list[EmailDraft]


class PreviewEmailDraftRequest(BaseModel):
    revision: int = Field(ge=1)
    recipient: EmailStr = Field(max_length=320)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=50_000)

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, value: str) -> str:
        if "\r" in value or "\n" in value:
            raise ValueError("Subject must be a single line.")
        if not value.strip():
            raise ValueError("Subject is required.")
        return value

    @field_validator("body")
    @classmethod
    def validate_body(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Body is required.")
        return value


class SendEmailDraftRequest(BaseModel):
    revision: int = Field(ge=1)


class SubmissionMessageSnapshot(BaseModel):
    route_recipient: str | None = None
    recipient: str | None = None
    subject: str
    body: str
    included_target_ids: list[str] = Field(default_factory=list)
    included_review_ids: list[UUID] = Field(default_factory=list)
    provider_message_id: str | None = None
    status: SubmissionDeliveryStatus
    error_reason: str | None = None
    dispatch_type: SubmissionDispatchType
    attempted_at: datetime
    sent_at: datetime | None = None


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
    message_snapshots: list[SubmissionMessageSnapshot] = Field(default_factory=list)


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
