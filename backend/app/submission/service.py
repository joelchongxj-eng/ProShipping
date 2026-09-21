import os
from collections import defaultdict
from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.email_delivery import (
    EmailDeliveryResult,
    EmailDeliveryService,
    EmailDeliveryStatus,
    create_email_delivery,
)
from app.models import CaseRecord, UploadComparisonResponse
from app.reviews.escalation import EscalationAssignment
from app.reviews.models import HumanReviewRecord, ReviewTargetType
from app.submission.models import (
    EmailDraft,
    EmailDraftItemReference,
    PreviewEmailDraftRequest,
    SendEmailDraftRequest,
    SenderEmailDrafts,
    SubmissionChannel,
    SubmissionDeliveryOutcome,
    SubmissionDeliveryStatus,
    SubmissionDispatch,
    SubmissionDispatchType,
    SubmissionItem,
    SubmissionMessageSnapshot,
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
        self.sender_factory: Callable[[str], EmailDeliveryService] = create_email_delivery
        self.supervisor_email_lookup: Callable[[], str | None] = (
            lambda: os.getenv("SUPERVISOR_EMAIL")
        )
        self.demo_email_recipient_lookup: Callable[[], str | None] = (
            lambda: os.getenv("DEMO_EMAIL_RECIPIENT")
        )
        self.app_environment_lookup: Callable[[], str] = (
            lambda: os.getenv("APP_ENV", "development")
        )
        self.supervisor_allowed_recipients_lookup: Callable[[], str | None] = (
            lambda: os.getenv("SUPERVISOR_ALLOWED_RECIPIENTS")
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

    def create_supervisor_draft(self) -> EmailDraft:
        items = self.store.active(SubmissionChannel.SUPERVISOR)
        if not items:
            raise SubmissionWorkflowError(409, "Supervisor submission list is empty.")
        snapshots = self.store.snapshots(SubmissionChannel.SUPERVISOR)
        dispatch_type = (
            SubmissionDispatchType.UPDATE if snapshots else SubmissionDispatchType.INITIAL
        )
        recipient = next(iter(snapshots), None) or self.supervisor_email_lookup()
        if not recipient:
            raise SubmissionWorkflowError(409, "Supervisor email is not configured.")
        if self._failed_delivery_pending(SubmissionChannel.SUPERVISOR, recipient):
            raise SubmissionWorkflowError(
                409,
                "Failed supervisor delivery must be resent before composing another message.",
            )
        subject = (
            "Update to Supervisor Escalation"
            if dispatch_type is SubmissionDispatchType.UPDATE
            else "Supervisor Shipping Document Escalations"
        )
        body = (
            self._supervisor_update_body(items)
            if dispatch_type is SubmissionDispatchType.UPDATE
            else self._supervisor_initial_body(items)
        )
        return self._create_draft(
            SubmissionChannel.SUPERVISOR,
            dispatch_type,
            recipient,
            recipient,
            subject,
            body,
            items,
        )

    def create_sender_drafts(self) -> SenderEmailDrafts:
        groups = self._sender_groups(self.store.active(SubmissionChannel.SENDER))
        if not groups:
            raise SubmissionWorkflowError(409, "Sender follow-up list is empty.")
        snapshots = self.store.snapshots(SubmissionChannel.SENDER)
        dispatch_type = (
            SubmissionDispatchType.UPDATE if snapshots else SubmissionDispatchType.INITIAL
        )
        drafts: list[EmailDraft] = []
        for route_recipient, items in groups.items():
            if self._failed_delivery_pending(SubmissionChannel.SENDER, route_recipient):
                raise SubmissionWorkflowError(
                    409,
                    "Failed sender delivery must be resent before composing another message.",
                )
            actual_recipient = self.demo_email_recipient_lookup() or route_recipient
            subject = (
                "Update: Shipping Document Clarification Required"
                if dispatch_type is SubmissionDispatchType.UPDATE
                else "Shipping Document Clarification Required"
            )
            body = (
                self._sender_update_body(items)
                if dispatch_type is SubmissionDispatchType.UPDATE
                else self._sender_initial_body(items)
            )
            drafts.append(
                self._create_draft(
                    SubmissionChannel.SENDER,
                    dispatch_type,
                    route_recipient,
                    actual_recipient,
                    subject,
                    body,
                    items,
                )
            )
        return SenderEmailDrafts(drafts=drafts)

    def preview_draft(
        self,
        draft_id: UUID,
        request: PreviewEmailDraftRequest,
    ) -> EmailDraft:
        draft = self._available_draft(draft_id, request.revision)
        self._validate_draft_queue(draft)
        self._validate_edited_recipient(draft, request.recipient)
        now = datetime.now(UTC)
        updated = draft.model_copy(
            update={
                "revision": draft.revision + 1,
                "recipient": request.recipient,
                "subject": request.subject,
                "body": request.body,
                "updated_at": now,
            }
        )
        return self.store.update_draft(updated)

    async def send_draft(
        self,
        draft_id: UUID,
        request: SendEmailDraftRequest,
    ) -> SubmissionDispatch:
        draft = self._available_draft(draft_id, request.revision)
        items = self._validate_draft_queue(draft)
        self._validate_edited_recipient(draft, draft.recipient)
        dispatch = await self._dispatch(
            draft.channel,
            draft.dispatch_type,
            {draft.route_recipient: (draft.subject, draft.body)},
            {draft.route_recipient: items},
            items,
            [item.target_id for item in items],
            [],
            delivery_recipients={draft.route_recipient: draft.recipient},
        )
        self.store.consume_draft(draft_id)
        return dispatch

    def _create_draft(
        self,
        channel: SubmissionChannel,
        dispatch_type: SubmissionDispatchType,
        route_recipient: str,
        recipient: str,
        subject: str,
        body: str,
        items: list[SubmissionItem],
    ) -> EmailDraft:
        now = datetime.now(UTC)
        draft = EmailDraft(
            draft_id=uuid4(),
            revision=1,
            channel=channel,
            dispatch_type=dispatch_type,
            route_recipient=route_recipient,
            recipient=recipient,
            subject=subject,
            body=body,
            included_items=[
                EmailDraftItemReference(
                    target_type=item.target_type,
                    target_id=item.target_id,
                    source_review_id=item.source_review_id,
                )
                for item in items
            ],
            created_at=now,
            updated_at=now,
        )
        return self.store.add_draft(draft)

    def _available_draft(self, draft_id: UUID, revision: int) -> EmailDraft:
        draft = self.store.draft(draft_id)
        if draft is None:
            raise SubmissionWorkflowError(404, "Email draft not found.")
        if self.store.draft_consumed(draft_id):
            raise SubmissionWorkflowError(409, "Email draft has already been sent.")
        if draft.revision != revision:
            raise SubmissionWorkflowError(409, "Email draft revision is stale.")
        return draft

    def _validate_draft_queue(self, draft: EmailDraft) -> list[SubmissionItem]:
        items = self.store.active(draft.channel)
        if draft.channel is SubmissionChannel.SENDER:
            items = [item for item in items if item.sender_email == draft.route_recipient]
        current = {
            (item.target_type, item.target_id, item.source_review_id) for item in items
        }
        expected = {
            (item.target_type, item.target_id, item.source_review_id)
            for item in draft.included_items
        }
        if current != expected:
            raise SubmissionWorkflowError(
                409,
                "Email draft is stale because the submission queue changed.",
            )
        return items

    def _validate_edited_recipient(self, draft: EmailDraft, recipient: str) -> None:
        if draft.channel is SubmissionChannel.SENDER:
            demo_recipient = self.demo_email_recipient_lookup()
            if demo_recipient and recipient != demo_recipient:
                raise SubmissionWorkflowError(
                    403, "Sender follow-up recipient cannot be changed."
                )
            if (
                not demo_recipient
                and self.app_environment_lookup().strip().lower() == "production"
                and recipient != draft.route_recipient
            ):
                raise SubmissionWorkflowError(
                    403, "Sender follow-up recipient cannot be changed."
                )
            return
        allowed = {draft.route_recipient}
        configured = self.supervisor_email_lookup()
        if configured:
            allowed.add(configured)
        extra = self.supervisor_allowed_recipients_lookup()
        if extra:
            allowed.update(value.strip() for value in extra.split(",") if value.strip())
        if recipient not in allowed:
            raise SubmissionWorkflowError(403, "Supervisor recipient is not allowed.")

    def _failed_delivery_pending(
        self,
        channel: SubmissionChannel,
        route_recipient: str,
    ) -> bool:
        for dispatch in reversed(self.store.dispatches(channel)):
            snapshots = [
                snapshot
                for snapshot in dispatch.message_snapshots
                if snapshot.route_recipient == route_recipient
            ]
            if snapshots:
                return snapshots[-1].status in {
                    SubmissionDeliveryStatus.FAILED,
                    SubmissionDeliveryStatus.NOT_CONFIGURED,
                }
        return False

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
        original_delivery_recipients = self.store.dispatch_delivery_recipients(dispatch_id)
        original_idempotency_keys = self.store.dispatch_idempotency_keys(dispatch_id)
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
        delivery_recipients = {
            recipient: original_delivery_recipients.get(recipient)
            for recipient in messages
        }
        idempotency_keys = {
            recipient: original_idempotency_keys[recipient]
            for recipient in messages
            if recipient in original_idempotency_keys
        }
        if original.channel is SubmissionChannel.SUPERVISOR and "" in messages:
            configured_recipient = self.supervisor_email_lookup()
            if configured_recipient:
                messages[configured_recipient] = messages.pop("")
                intended[configured_recipient] = intended.pop("", [])
                delivery_recipients[configured_recipient] = configured_recipient
                delivery_recipients.pop("", None)
                if "" in idempotency_keys:
                    idempotency_keys[configured_recipient] = idempotency_keys.pop("")
        return await self._dispatch(
            original.channel,
            SubmissionDispatchType.RESEND,
            messages,
            intended,
            original.item_snapshot,
            original.added_target_ids,
            original.removed_target_ids,
            parent_dispatch_id=original.dispatch_id,
            delivery_recipients=delivery_recipients,
            idempotency_keys=idempotency_keys,
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
        delivery_recipients: dict[str, str | None] | None = None,
        idempotency_keys: dict[str, str] | None = None,
    ) -> SubmissionDispatch:
        now = datetime.now(UTC)
        dispatch_id = uuid4()
        outcomes: list[SubmissionDeliveryOutcome] = []
        message_snapshots: list[SubmissionMessageSnapshot] = []
        successful_ids: set[str] = set()
        attempted_recipients: dict[str, str | None] = {}
        used_idempotency_keys: dict[str, str] = {}
        for index, (recipient, (subject, body)) in enumerate(messages.items()):
            if delivery_recipients is not None and recipient in delivery_recipients:
                delivery_recipient = delivery_recipients[recipient]
            else:
                delivery_recipient = recipient or None
            if channel is SubmissionChannel.SENDER and delivery_recipients is None:
                delivery_recipient = self.demo_email_recipient_lookup() or delivery_recipient
            idempotency_key = (
                idempotency_keys.get(recipient)
                if idempotency_keys is not None
                else None
            ) or f"proshipping/{dispatch_id}/{index}"
            attempted_recipients[recipient] = delivery_recipient
            used_idempotency_keys[recipient] = idempotency_key
            outcome = await self._deliver(
                delivery_recipient,
                subject,
                body,
                idempotency_key=idempotency_key,
            )
            outcomes.append(outcome)
            snapshot_items = intended_snapshots.get(recipient, [])
            message_snapshots.append(
                SubmissionMessageSnapshot(
                    route_recipient=recipient or None,
                    recipient=delivery_recipient,
                    subject=subject,
                    body=body,
                    included_target_ids=[item.target_id for item in snapshot_items],
                    included_review_ids=[item.source_review_id for item in snapshot_items],
                    provider_message_id=outcome.provider_message_id,
                    status=outcome.status,
                    error_reason=outcome.error_reason,
                    dispatch_type=dispatch_type,
                    attempted_at=outcome.attempted_at,
                    sent_at=(
                        outcome.attempted_at
                        if outcome.status is SubmissionDeliveryStatus.SENT
                        else None
                    ),
                )
            )
            if outcome.status is SubmissionDeliveryStatus.SENT and recipient:
                snapshot = intended_snapshots.get(recipient, [])
                self.store.set_successful_snapshot(channel, recipient, snapshot, outcome.attempted_at)
                self.store.complete(channel, snapshot)
                successful_ids.update(item.target_id for item in snapshot)
        completed = datetime.now(UTC)
        dispatch = SubmissionDispatch(
            dispatch_id=dispatch_id,
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
            message_snapshots=message_snapshots,
        )
        return self.store.add_dispatch(
            dispatch,
            messages=messages,
            delivery_recipients=attempted_recipients,
            idempotency_keys=used_idempotency_keys,
            intended_snapshots=intended_snapshots,
        )

    async def _deliver(
        self,
        recipient: str | None,
        subject: str,
        body: str,
        *,
        idempotency_key: str,
    ) -> SubmissionDeliveryOutcome:
        attempted_at = datetime.now(UTC)
        if recipient is None:
            return SubmissionDeliveryOutcome(
                recipient=recipient,
                status=SubmissionDeliveryStatus.NOT_CONFIGURED,
                attempted_at=attempted_at,
                error_reason="Email delivery recipient is not configured.",
            )
        try:
            result = await self.sender_factory(recipient).send(
                subject,
                body,
                idempotency_key=idempotency_key,
            )
        except Exception:
            result = EmailDeliveryResult(
                status=EmailDeliveryStatus.FAILED,
                error_reason="Email delivery failed.",
            )
        return SubmissionDeliveryOutcome(
            recipient=recipient,
            status=SubmissionDeliveryStatus(result.status.value),
            attempted_at=attempted_at,
            error_reason=result.error_reason,
            provider_message_id=result.provider_message_id,
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
        issue_label = item.field.value if item.field is not None else "Case-level issue"
        return [
            f"Case: {item.target_id}",
            f"Subject: {item.subject}",
            f"Field: {issue_label}",
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
