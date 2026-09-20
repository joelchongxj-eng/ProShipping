from threading import RLock

from app.reviews.models import (
    HumanReviewRecord,
    NewHumanReviewRecord,
    ReviewTargetType,
)


class HumanReviewStore:
    def __init__(self) -> None:
        self._records: dict[
            tuple[ReviewTargetType, str],
            list[HumanReviewRecord],
        ] = {}
        self._sequence = 0
        self._lock = RLock()

    def append(self, record: NewHumanReviewRecord) -> HumanReviewRecord:
        with self._lock:
            self._sequence += 1
            stored = HumanReviewRecord(
                **record.model_dump(),
                sequence=self._sequence,
            )
            key = (stored.target_type, stored.target_id)
            self._records.setdefault(key, []).append(stored)
            return stored.model_copy(deep=True)

    def list(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> list[HumanReviewRecord]:
        with self._lock:
            return [
                record.model_copy(deep=True)
                for record in self._records.get((target_type, target_id), [])
            ]

    def clear(self) -> None:
        with self._lock:
            self._records.clear()
            self._sequence = 0
