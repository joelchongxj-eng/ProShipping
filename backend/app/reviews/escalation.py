from datetime import datetime
from enum import StrEnum
from threading import RLock
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.reviews.models import ReviewTargetType, ShippingFieldName


class EscalationDeliveryStatus(StrEnum):
    SENT = "SENT"
    FAILED = "FAILED"
    NOT_CONFIGURED = "NOT_CONFIGURED"


class EscalationDeliveryAttempt(BaseModel):
    attempt_id: UUID
    attempt_number: int = Field(ge=1)
    status: EscalationDeliveryStatus
    attempted_at: datetime
    error_reason: str | None = None


class EscalationAssignment(BaseModel):
    assignment_id: UUID
    review_id: UUID
    target_type: ReviewTargetType
    target_id: str
    field: ShippingFieldName
    si_value: str | None = None
    bl_value: str | None = None
    escalation_reason: str
    reviewer_action: str
    requested_decision: str
    supervisor_email: str | None = None
    delivery_status: EscalationDeliveryStatus | None = None
    delivery_attempts: list[EscalationDeliveryAttempt] = Field(default_factory=list)
    created_at: datetime


class EscalationAssignmentHistory(BaseModel):
    target_type: ReviewTargetType
    target_id: str
    assignments: list[EscalationAssignment] = Field(default_factory=list)


class EscalationStore:
    """Append-only assignment snapshots with a latest-state projection."""

    def __init__(self) -> None:
        self._events: dict[UUID, list[EscalationAssignment]] = {}
        self._latest: dict[UUID, EscalationAssignment] = {}
        self._target_assignments: dict[
            tuple[ReviewTargetType, str],
            list[UUID],
        ] = {}
        self._lock = RLock()

    def create(self, assignment: EscalationAssignment) -> EscalationAssignment:
        with self._lock:
            assignment_id = assignment.assignment_id
            if assignment_id in self._events:
                raise ValueError("Escalation assignment already exists")
            key = (assignment.target_type, assignment.target_id)
            self._target_assignments.setdefault(key, []).append(assignment_id)
            return self._append(assignment)

    def record_delivery(
        self,
        assignment_id: UUID,
        *,
        status: EscalationDeliveryStatus,
        attempted_at: datetime,
        supervisor_email: str | None,
        error_reason: str | None = None,
    ) -> EscalationAssignment:
        with self._lock:
            current = self._latest[assignment_id]
            attempt = EscalationDeliveryAttempt(
                attempt_id=uuid4(),
                attempt_number=len(current.delivery_attempts) + 1,
                status=status,
                attempted_at=attempted_at,
                error_reason=error_reason,
            )
            updated = current.model_copy(
                deep=True,
                update={
                    "supervisor_email": supervisor_email,
                    "delivery_status": status,
                    "delivery_attempts": [*current.delivery_attempts, attempt],
                },
            )
            return self._append(updated)

    def get(self, assignment_id: UUID) -> EscalationAssignment | None:
        with self._lock:
            assignment = self._latest.get(assignment_id)
            return assignment.model_copy(deep=True) if assignment else None

    def list(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> list[EscalationAssignment]:
        with self._lock:
            ids = self._target_assignments.get((target_type, target_id), [])
            return [self._latest[item].model_copy(deep=True) for item in ids]

    def clear(self) -> None:
        with self._lock:
            self._events.clear()
            self._latest.clear()
            self._target_assignments.clear()

    def _append(self, assignment: EscalationAssignment) -> EscalationAssignment:
        stored = assignment.model_copy(deep=True)
        self._events.setdefault(stored.assignment_id, []).append(stored)
        self._latest[stored.assignment_id] = stored
        return stored.model_copy(deep=True)
