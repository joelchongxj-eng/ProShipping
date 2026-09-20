from datetime import datetime
from enum import StrEnum
from threading import RLock
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models import CaseRecord, CaseStatus, UploadComparisonResponse
from app.reviews.models import ReviewTargetType


class RetryExecutionStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class RetryAttempt(BaseModel):
    retry_id: UUID
    target_type: ReviewTargetType
    target_id: str
    attempt_number: int = Field(ge=1)
    requested_review_id: UUID
    execution_status: RetryExecutionStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    previous_automated_status: CaseStatus
    new_automated_status: CaseStatus | None = None
    previous_result_hash: str
    new_result_hash: str | None = None
    error_reason: str | None = None
    new_automated_result: CaseRecord | UploadComparisonResponse | None = None


class RetryAttemptHistory(BaseModel):
    target_type: ReviewTargetType
    target_id: str
    attempts: list[RetryAttempt] = Field(default_factory=list)


class RetryExecutionStore:
    """Append-only execution snapshots reduced to one current RetryAttempt per retry."""

    def __init__(self) -> None:
        self._events: dict[
            tuple[ReviewTargetType, str],
            list[RetryAttempt],
        ] = {}
        self._latest: dict[UUID, RetryAttempt] = {}
        self._lock = RLock()

    def create_pending(
        self,
        *,
        target_type: ReviewTargetType,
        target_id: str,
        requested_review_id: UUID,
        previous_automated_status: CaseStatus,
        previous_result_hash: str,
    ) -> RetryAttempt:
        with self._lock:
            key = (target_type, target_id)
            attempt_number = len(
                {
                    event.retry_id
                    for event in self._events.get(key, [])
                }
            ) + 1
            attempt = RetryAttempt(
                retry_id=uuid4(),
                target_type=target_type,
                target_id=target_id,
                attempt_number=attempt_number,
                requested_review_id=requested_review_id,
                execution_status=RetryExecutionStatus.PENDING,
                previous_automated_status=previous_automated_status,
                previous_result_hash=previous_result_hash,
            )
            return self._append(attempt)

    def transition(
        self,
        retry_id: UUID,
        *,
        execution_status: RetryExecutionStatus,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
        new_automated_status: CaseStatus | None = None,
        new_result_hash: str | None = None,
        error_reason: str | None = None,
        new_automated_result: CaseRecord | UploadComparisonResponse | None = None,
    ) -> RetryAttempt:
        with self._lock:
            current = self._latest[retry_id]
            event = current.model_copy(
                deep=True,
                update={
                    "execution_status": execution_status,
                    "started_at": started_at,
                    "completed_at": completed_at,
                    "new_automated_status": new_automated_status,
                    "new_result_hash": new_result_hash,
                    "error_reason": error_reason,
                    "new_automated_result": new_automated_result,
                },
            )
            return self._append(event)

    def list(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> list[RetryAttempt]:
        with self._lock:
            retry_ids: list[UUID] = []
            for event in self._events.get((target_type, target_id), []):
                if event.retry_id not in retry_ids:
                    retry_ids.append(event.retry_id)
            return [self._latest[retry_id].model_copy(deep=True) for retry_id in retry_ids]

    def clear(self) -> None:
        with self._lock:
            self._events.clear()
            self._latest.clear()

    def _append(self, event: RetryAttempt) -> RetryAttempt:
        stored = event.model_copy(deep=True)
        key = (stored.target_type, stored.target_id)
        self._events.setdefault(key, []).append(stored)
        self._latest[stored.retry_id] = stored
        return stored.model_copy(deep=True)
