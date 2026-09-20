from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import CaseStatus, FieldStatus


class ReviewTargetType(StrEnum):
    COMPETITION_CASE = "COMPETITION_CASE"
    UPLOAD_COMPARISON = "UPLOAD_COMPARISON"


class ReviewScope(StrEnum):
    CASE = "CASE"
    FIELD = "FIELD"


class ReviewSide(StrEnum):
    SI = "SI"
    BL = "BL"
    BOTH = "BOTH"


class ReviewAction(StrEnum):
    CONFIRM = "CONFIRM"
    CORRECT = "CORRECT"
    EQUIVALENT = "EQUIVALENT"
    UNREADABLE = "UNREADABLE"
    ADD_NOTE = "ADD_NOTE"
    RETRY = "RETRY"
    ESCALATE = "ESCALATE"


class HumanReviewStatus(StrEnum):
    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    CONFIRMED = "CONFIRMED"
    CORRECTED = "CORRECTED"
    ACCEPTED_EQUIVALENT = "ACCEPTED_EQUIVALENT"
    UNREADABLE = "UNREADABLE"
    RETRY_REQUESTED = "RETRY_REQUESTED"
    ESCALATED = "ESCALATED"


class ShippingFieldName(StrEnum):
    SHIPPER = "shipper"
    CONSIGNEE = "consignee"
    NOTIFY_PARTY = "notify_party"
    PORT_OF_LOADING = "port_of_loading"
    PORT_OF_DISCHARGE = "port_of_discharge"
    CONTAINER_COUNT = "container_count"
    GROSS_WEIGHT_KG = "gross_weight_kg"


class CreateHumanReviewRequest(BaseModel):
    scope: ReviewScope
    field: ShippingFieldName | None = None
    side: ReviewSide | None = None
    action: ReviewAction
    corrected_value: str | None = None
    note: str | None = None
    escalation_reason: str | None = None


class NewHumanReviewRecord(BaseModel):
    review_id: UUID
    target_type: ReviewTargetType
    target_id: str
    scope: ReviewScope
    field: ShippingFieldName | None = None
    side: ReviewSide | None = None
    action: ReviewAction
    automated_status: CaseStatus
    automated_field_status: FieldStatus | None = None
    original_value: str | None = None
    original_si_value: str | None = None
    original_bl_value: str | None = None
    corrected_value: str | None = None
    note: str | None = None
    review_status: HumanReviewStatus
    is_escalated: bool = False
    escalation_reason: str | None = None
    escalated_at: datetime | None = None
    automated_result_hash: str
    created_at: datetime


class HumanReviewRecord(NewHumanReviewRecord):
    sequence: int = Field(ge=1)


class HumanReviewHistory(BaseModel):
    target_type: ReviewTargetType
    target_id: str
    reviews: list[HumanReviewRecord] = Field(default_factory=list)


class EffectiveSideValue(BaseModel):
    automated_value: str | None = None
    reviewed_value: str | None = None
    effective_value: str | None = None


class EffectiveFieldValue(BaseModel):
    si: EffectiveSideValue
    bl: EffectiveSideValue
    accepted_equivalent: bool = False


class FieldReviewSummary(BaseModel):
    field: ShippingFieldName
    side: ReviewSide
    review_status: HumanReviewStatus
    latest_review: HumanReviewRecord


class HumanReviewSummary(BaseModel):
    target_type: ReviewTargetType
    target_id: str
    automated_status: CaseStatus
    review_status: HumanReviewStatus
    is_escalated: bool = False
    escalation_reason: str | None = None
    escalated_at: datetime | None = None
    latest_review: HumanReviewRecord | None = None
    case_review: HumanReviewRecord | None = None
    field_reviews: list[FieldReviewSummary] = Field(default_factory=list)
    effective_values: dict[ShippingFieldName, EffectiveFieldValue]
    review_count: int = 0
