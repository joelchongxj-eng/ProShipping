from datetime import datetime
from threading import RLock
from uuid import UUID

from app.submission.models import (
    SubmissionChannel,
    SubmissionDispatch,
    SubmissionItem,
)


class SubmissionWorkflowStore:
    """In-memory append-only events with active and successful projections."""

    def __init__(self) -> None:
        self._item_events: dict[tuple[SubmissionChannel, str], list[SubmissionItem | None]] = {}
        self._active: dict[tuple[SubmissionChannel, str], SubmissionItem] = {}
        self._dispatches: list[SubmissionDispatch] = []
        self._dispatch_by_id: dict[UUID, SubmissionDispatch] = {}
        self._messages: dict[UUID, dict[str, tuple[str, str]]] = {}
        self._intended_snapshots: dict[UUID, dict[str, list[SubmissionItem]]] = {}
        self._successful_snapshots: dict[
            tuple[SubmissionChannel, str], list[SubmissionItem]
        ] = {}
        self._successful_at: dict[tuple[SubmissionChannel, str], datetime] = {}
        self._lock = RLock()

    def upsert(self, channel: SubmissionChannel, item: SubmissionItem) -> SubmissionItem:
        with self._lock:
            key = (channel, item.target_id)
            stored = item.model_copy(deep=True)
            self._item_events.setdefault(key, []).append(stored)
            self._active[key] = stored
            return stored.model_copy(deep=True)

    def remove(self, channel: SubmissionChannel, target_id: str) -> bool:
        with self._lock:
            key = (channel, target_id)
            if key not in self._active:
                return False
            self._item_events.setdefault(key, []).append(None)
            del self._active[key]
            return True

    def complete(self, channel: SubmissionChannel, items: list[SubmissionItem]) -> None:
        """Remove only the exact item versions confirmed by a successful delivery."""
        with self._lock:
            for item in items:
                key = (channel, item.target_id)
                current = self._active.get(key)
                if current is None or current.source_review_id != item.source_review_id:
                    continue
                self._item_events.setdefault(key, []).append(None)
                del self._active[key]

    def active(self, channel: SubmissionChannel) -> list[SubmissionItem]:
        with self._lock:
            return sorted(
                (
                    item.model_copy(deep=True)
                    for (item_channel, _), item in self._active.items()
                    if item_channel is channel
                ),
                key=lambda item: item.target_id,
            )

    def add_dispatch(
        self,
        dispatch: SubmissionDispatch,
        *,
        messages: dict[str, tuple[str, str]],
        intended_snapshots: dict[str, list[SubmissionItem]],
    ) -> SubmissionDispatch:
        with self._lock:
            stored = dispatch.model_copy(deep=True)
            self._dispatches.append(stored)
            self._dispatch_by_id[stored.dispatch_id] = stored
            self._messages[stored.dispatch_id] = dict(messages)
            self._intended_snapshots[stored.dispatch_id] = {
                recipient: [item.model_copy(deep=True) for item in items]
                for recipient, items in intended_snapshots.items()
            }
            return stored.model_copy(deep=True)

    def dispatch(self, dispatch_id: UUID) -> SubmissionDispatch | None:
        with self._lock:
            value = self._dispatch_by_id.get(dispatch_id)
            return value.model_copy(deep=True) if value else None

    def dispatches(self, channel: SubmissionChannel) -> list[SubmissionDispatch]:
        with self._lock:
            return [
                item.model_copy(deep=True)
                for item in self._dispatches
                if item.channel is channel
            ]

    def dispatch_messages(self, dispatch_id: UUID) -> dict[str, tuple[str, str]]:
        with self._lock:
            return dict(self._messages.get(dispatch_id, {}))

    def intended_snapshots(self, dispatch_id: UUID) -> dict[str, list[SubmissionItem]]:
        with self._lock:
            return {
                recipient: [item.model_copy(deep=True) for item in items]
                for recipient, items in self._intended_snapshots.get(dispatch_id, {}).items()
            }

    def set_successful_snapshot(
        self,
        channel: SubmissionChannel,
        recipient: str,
        items: list[SubmissionItem],
        sent_at: datetime,
    ) -> None:
        with self._lock:
            key = (channel, recipient)
            self._successful_snapshots[key] = [item.model_copy(deep=True) for item in items]
            self._successful_at[key] = sent_at

    def snapshots(self, channel: SubmissionChannel) -> dict[str, list[SubmissionItem]]:
        with self._lock:
            return {
                recipient: [item.model_copy(deep=True) for item in items]
                for (item_channel, recipient), items in self._successful_snapshots.items()
                if item_channel is channel
            }

    def successful_times(self, channel: SubmissionChannel) -> list[datetime]:
        with self._lock:
            return [
                value
                for (item_channel, _), value in self._successful_at.items()
                if item_channel is channel
            ]

    def clear(self) -> None:
        with self._lock:
            self._item_events.clear()
            self._active.clear()
            self._dispatches.clear()
            self._dispatch_by_id.clear()
            self._messages.clear()
            self._intended_snapshots.clear()
            self._successful_snapshots.clear()
            self._successful_at.clear()
