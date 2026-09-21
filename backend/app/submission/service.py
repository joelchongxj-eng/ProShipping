import os
from collections import defaultdict
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID, uuid4

from app.models import CaseRecord, UploadComparisonResponse
from app.reviews.escalation import EscalationAssignment
from app.reviews.escalation_service import SMTPEmailSender
from app.reviews.models import HumanReviewRecord, ReviewTargetType
from app.submission.models import (
    SubmissionChannel,
    SubmissionDeliveryOutcome,
    SubmissionDeliveryStatus,
    SubmissionDispatch,
    SubmissionDispatchType,
    SubmissionItem,
    SubmissionSection,
    SubmissionSectionStatus,
    SubmissionWorkflowResponse,
)
from app.submission.store import SubmissionWorkflowStore


class SubmissionWorkflowError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class SubmissionEmailSender(Protocol):
    recipient: str

    async def send(self, subject: str, body: str) -> None: ...


class SubmissionWorkflowService:
    def __init__(
        self,
        store: SubmissionWorkflowStore,
        *,
        case_lookup: Callable[[str], CaseRecord | None],
        upload_lookup: Callable[[str], UploadComparisonResponse | None],
    ) -> None:
        self.store = store
        self.case_lookup = case_lookup
        self.upload_lookup = upload_lookup
        self.sender_factory: Callable[[str], SubmissionEmailSender | None] = (
            SMTPEmailSender.from_environment_for_recipient
        )
        self.supervisor_email_lookup: Callable[[], str | None] = (
            lambda: os.getenv("SUPERVISOR_EMAIL")
        )
        self.demo_email_recipient_lookup: Callable[[], str | None] = (
            lambda: os.getenv("DEMO_EMAIL_RECIPIENT")
        )

    def add_supervisor(
        self,
        review: HumanReviewRecord,
        assignment: EscalationAssignment,
    ) -> SubmissionItem:
        target = self._target(review.target_type, review.target_id)
        item = SubmissionItem(
            target_type=review.target_type,
            target_id=review.target_id,
            subject=self._subject(target, review.target_id),
            automated_status=review.automated_status,
            review_reason=target.review_reason,
            field=assignment.field,
            si_value=assignment.si_value,
            bl_value=assignment.bl_value,
            reason=assignment.escalation_reason,
            source_review_id=review.review_id,
            added_at=review.created_at,
        )
        return self.store.upsert(SubmissionChannel.SUPERVISOR, item)

    def add_sender(self, review: HumanReviewRecord) -> SubmissionItem:
        if review.target_type is not ReviewTargetType.COMPETITION_CASE:
            raise SubmissionWorkflowError(
                409,
                "Sender follow-up requires a competition email with a sender address.",
            )
        target = self.case_lookup(review.target_id)
        if target is None:
            raise SubmissionWorkflowError(404, "Submission target not found.")
        item = SubmissionItem(
            target_type=review.target_type,
            target_id=review.target_id,
            subject=target.email.subject,
            sender_email=target.email.sender,
            automated_status=review.automated_status,
            review_reason=target.review_reason,
            field=review.field,
            si_value=review.original_si_value,
            bl_value=review.original_bl_value,
            reason=review.request_reason or "",
            source_review_id=review.review_id,
            added_at=review.created_at,
        )
        return self.store.upsert(SubmissionChannel.SENDER, item)

    def aggregate(self) -> SubmissionWorkflowResponse:
        return SubmissionWorkflowResponse(
            supervisor=self._section(SubmissionChannel.SUPERVISOR),
            sender_follow_up=self._section(SubmissionChannel.SENDER),
        )

    def remove(self, channel: SubmissionChannel, target_id: str) -> None:
        if not self.store.remove(channel, target_id):
            raise SubmissionWorkflowError(404, "Active submission item not found.")

    async def supervisor_submit(self) -> SubmissionDispatch:
        if self.store.snapshots(SubmissionChannel.SUPERVISOR):
            raise SubmissionWorkflowError(
                409,
                "A supervisor submission already succeeded; use update when the list changes.",
            )
        items = self.store.active(SubmissionChannel.SUPERVISOR)
        if not items:
            raise SubmissionWorkflowError(409, "Supervisor submission list is empty.")
        recipient = self.supervisor_email_lookup()
        subject = "Supervisor Shipping Document Escalations"
        body = self._supervisor_initial_body(items)
        return await self._dispatch(
            SubmissionChannel.SUPERVISOR,
            SubmissionDispatchType.INITIAL,
            {recipient or "": (subject, body)},
            {recipient or "": items},
            items,
            [item.target_id for item in items],
            [],
        )

    async def supervisor_update(self) -> SubmissionDispatch:
        snapshots = self.store.snapshots(SubmissionChannel.SUPERVISOR)
        if not snapshots:
            raise SubmissionWorkflowError(409, "No successful supervisor submission exists.")
        recipient = next(iter(snapshots))
        pending = self.store.active(SubmissionChannel.SUPERVISOR)
        if not pending:
            raise SubmissionWorkflowError(409, "Supervisor submission has no changes.")
        subject = "Update to Supervisor Escalation"
        body = self._supervisor_update_body(pending)
        return await self._dispatch(
            SubmissionChannel.SUPERVISOR,
            SubmissionDispatchType.UPDATE,
            {recipient: (subject, body)},
            {recipient: pending},
            pending,
            [item.target_id for item in pending],
            [],
        )

    async def sender_send(self) -> SubmissionDispatch:
        if self.store.snapshots(SubmissionChannel.SENDER):
            raise SubmissionWorkflowError(
                409,
                "A sender submission already has successful deliveries; use update or resend.",
            )
        items = self.store.active(SubmissionChannel.SENDER)
        groups = self._sender_groups(items)
        if not groups:
            raise SubmissionWorkflowError(409, "Sender follow-up list is empty.")
        messages = {
            recipient: (
                "Shipping Document Clarification Required",
                self._sender_initial_body(group),
            )
            for recipient, group in groups.items()
        }
        return await self._dispatch(
            SubmissionChannel.SENDER,
            SubmissionDispatchType.INITIAL,
            messages,
            groups,
            items,
            [item.target_id for item in items],
            [],
        )

    async def sender_update(self) -> SubmissionDispatch:
        snapshots = self.store.snapshots(SubmissionChannel.SENDER)
        if not snapshots:
            raise SubmissionWorkflowError(409, "No successful sender submission exists.")
        dispatches = self.store.dispatches(SubmissionChannel.SENDER)
        if dispatches and any(
            outcome.status
            in {
                SubmissionDeliveryStatus.FAILED,
                SubmissionDeliveryStatus.NOT_CONFIGURED,
            }
            for outcome in dispatches[-1].outcomes
        ):
            raise SubmissionWorkflowError(
                409,
                "Failed sender deliveries must be resent before sending an update.",
            )
        pending = self._sender_groups(self.store.active(SubmissionChannel.SENDER))
        if not pending:
            raise SubmissionWorkflowError(409, "Sender follow-up has no changes.")
        messages: dict[str, tuple[str, str]] = {}
        intended: dict[str, list[SubmissionItem]] = {}
        all_added: list[SubmissionItem] = []
        for recipient, added in pending.items():
            messages[recipient] = (
                "Update: Shipping Document Clarification Required",
                self._sender_update_body(added),
            )
            intended[recipient] = added
            all_added.extend(added)
        items = self.store.active(SubmissionChannel.SENDER)
        return await self._dispatch(
            SubmissionChannel.SENDER,
            SubmissionDispatchType.UPDATE,
            messages,
            intended,
            items,
            [item.target_id for item in all_added],
            [],
        )

    async def resend(self, dispatch_id: UUID) -> SubmissionDispatch:
        original = self.store.dispatch(dispatch_id)
        if original is None:
            raise SubmissionWorkflowError(404, "Submission dispatch not found.")
        original_messages = self.store.dispatch_messages(dispatch_id)
        retry_message_keys = {
            message_key
            for message_key, outcome in zip(
                original_messages,
                original.outcomes,
                strict=False,
            )
            if outcome.status
            in {
                SubmissionDeliveryStatus.FAILED,
                SubmissionDeliveryStatus.NOT_CONFIGURED,
            }
        }
        if not retry_message_keys:
            raise SubmissionWorkflowError(409, "Only failed deliveries can be resent.")
        messages = {
            recipient: message
            for recipient, message in original_messages.items()
            if recipient in retry_message_keys
        }
        intended = {
            recipient: items
            for recipient, items in self.store.intended_snapshots(dispatch_id).items()
            if recipient in retry_message_keys
        }
        if original.channel is SubmissionChannel.SUPERVISOR and "" in messages:
            configured_recipient = self.supervisor_email_lookup()
            if configured_recipient:
                messages[configured_recipient] = messages.pop("")
                intended[configured_recipient] = intended.pop("", [])
        return await self._dispatch(
            original.channel,
            SubmissionDispatchType.RESEND,
            messages,
            intended,
            original.item_snapshot,
            original.added_target_ids,
            original.removed_target_ids,
            parent_dispatch_id=original.dispatch_id,
        )

    async def _dispatch(
        self,
        channel: SubmissionChannel,
        dispatch_type: SubmissionDispatchType,
        messages: dict[str, tuple[str, str]],
        intended_snapshots: dict[str, list[SubmissionItem]],
        item_snapshot: list[SubmissionItem],
        added_ids: list[str],
        removed_ids: list[str],
        *,
        parent_dispatch_id: UUID | None = None,
    ) -> SubmissionDispatch:
        now = datetime.now(UTC)
        outcomes: list[SubmissionDeliveryOutcome] = []
        successful_ids: set[str] = set()
        for recipient, (subject, body) in messages.items():
            delivery_recipient = recipient or None
            if channel is SubmissionChannel.SENDER:
                delivery_recipient = self.demo_email_recipient_lookup() or delivery_recipient
            outcome = await self._deliver(delivery_recipient, subject, body)
            outcomes.append(outcome)
            if outcome.status is SubmissionDeliveryStatus.SENT and recipient:
                snapshot = intended_snapshots.get(recipient, [])
                self.store.set_successful_snapshot(channel, recipient, snapshot, outcome.attempted_at)
                self.store.complete(channel, snapshot)
                successful_ids.update(item.target_id for item in snapshot)
        completed = datetime.now(UTC)
        dispatch = SubmissionDispatch(
            dispatch_id=uuid4(),
            channel=channel,
            dispatch_type=dispatch_type,
            created_at=now,
            completed_at=completed,
            parent_dispatch_id=parent_dispatch_id,
            item_snapshot=item_snapshot,
            added_target_ids=sorted(set(added_ids)),
            removed_target_ids=sorted(set(removed_ids)),
            successful_snapshot_target_ids=sorted(successful_ids),
            outcomes=outcomes,
        )
        return self.store.add_dispatch(
            dispatch,
            messages=messages,
            intended_snapshots=intended_snapshots,
        )

    async def _deliver(
        self,
        recipient: str | None,
        subject: str,
        body: str,
    ) -> SubmissionDeliveryOutcome:
        attempted_at = datetime.now(UTC)
        sender = self.sender_factory(recipient) if recipient else None
        if sender is None:
            missing = SMTPEmailSender.missing_configuration_keys(recipient)
            detail = "Email delivery is not configured."
            if missing:
                detail = f"{detail} Missing SMTP configuration: {', '.join(missing)}."
            return SubmissionDeliveryOutcome(
                recipient=recipient,
                status=SubmissionDeliveryStatus.NOT_CONFIGURED,
                attempted_at=attempted_at,
                error_reason=detail,
            )
        try:
            await sender.send(subject, body)
        except Exception:
            return SubmissionDeliveryOutcome(
                recipient=recipient,
                status=SubmissionDeliveryStatus.FAILED,
                attempted_at=attempted_at,
                error_reason="Email delivery failed.",
            )
        return SubmissionDeliveryOutcome(
            recipient=recipient,
            status=SubmissionDeliveryStatus.SENT,
            attempted_at=attempted_at,
        )

    def _section(self, channel: SubmissionChannel) -> SubmissionSection:
        items = self.store.active(channel)
        sent_times = self.store.successful_times(channel)
        if not sent_times:
            status = SubmissionSectionStatus.DRAFT
        elif items:
            status = SubmissionSectionStatus.UPDATE_REQUIRED
        else:
            status = SubmissionSectionStatus.SUBMITTED
        return SubmissionSection(
            status=status,
            items=items,
            added_since_last_send=len(items),
            removed_since_last_send=0,
            last_sent_at=max(sent_times) if sent_times else None,
            dispatches=self.store.dispatches(channel),
        )

    @staticmethod
    def _sender_groups(items: list[SubmissionItem]) -> dict[str, list[SubmissionItem]]:
        groups: dict[str, list[SubmissionItem]] = defaultdict(list)
        for item in items:
            if item.sender_email:
                groups[item.sender_email].append(item)
        return {recipient: sorted(group, key=lambda item: item.target_id) for recipient, group in groups.items()}

    def _target(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> CaseRecord | UploadComparisonResponse:
        target = (
            self.case_lookup(target_id)
            if target_type is ReviewTargetType.COMPETITION_CASE
            else self.upload_lookup(target_id)
        )
        if target is None:
            raise SubmissionWorkflowError(404, "Submission target not found.")
        return target

    @staticmethod
    def _subject(target: CaseRecord | UploadComparisonResponse, target_id: str) -> str:
        if isinstance(target, CaseRecord):
            return target.email.subject
        return f"Manual upload comparison {target_id}"

    @staticmethod
    def _item_lines(item: SubmissionItem) -> list[str]:
        return [
            f"Case: {item.target_id}",
            f"Subject: {item.subject}",
            f"Field: {item.field.value}",
            f"Shipping Instruction: {item.si_value or '[missing]'}",
            f"Draft Bill of Lading: {item.bl_value or '[missing]'}",
            f"Reason: {item.reason}",
        ]

    @classmethod
    def _supervisor_initial_body(cls, items: list[SubmissionItem]) -> str:
        lines = ["The following shipping document cases require supervisor review:", ""]
        for item in items:
            lines.extend(cls._item_lines(item) + [""])
        return "\n".join(lines).rstrip()

    @classmethod
    def _supervisor_update_body(
        cls,
        added: list[SubmissionItem],
    ) -> str:
        lines = ["New cases:"]
        for item in added:
            lines.extend(cls._item_lines(item) + [""])
        return "\n".join(lines)

    @classmethod
    def _sender_initial_body(cls, items: list[SubmissionItem]) -> str:
        lines = [
            "We are currently reviewing your shipping documents.",
            "",
            "The following issues require clarification:",
            "",
        ]
        for item in items:
            lines.extend(cls._item_lines(item) + [""])
        lines.append("Please confirm or provide the requested information so verification can continue.")
        return "\n".join(lines)

    @classmethod
    def _sender_update_body(
        cls,
        added: list[SubmissionItem],
    ) -> str:
        lines = ["New follow-up cases:"]
        for item in added:
            lines.extend(cls._item_lines(item) + [""])
        return "\n".join(lines)
