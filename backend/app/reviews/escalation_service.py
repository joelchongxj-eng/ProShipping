import asyncio
import os
import smtplib
from datetime import UTC, datetime
from email.message import EmailMessage
from typing import Protocol
from uuid import UUID, uuid4

from app.reviews.escalation import (
    EscalationAssignment,
    EscalationAssignmentHistory,
    EscalationDeliveryStatus,
    EscalationStore,
)
from app.reviews.models import (
    CreateHumanReviewRequest,
    HumanReviewRecord,
    ReviewTargetType,
)


class EscalationError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class EscalationEmailSender(Protocol):
    recipient: str

    async def send(self, subject: str, body: str) -> None: ...


class SMTPEmailSender:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        sender: str,
        recipient: str,
        username: str | None,
        password: str | None,
        use_tls: bool,
    ) -> None:
        self.host = host
        self.port = port
        self.sender = sender
        self.recipient = recipient
        self.username = username
        self.password = password
        self.use_tls = use_tls

    @classmethod
    def from_environment(cls) -> "SMTPEmailSender | None":
        return cls.from_environment_for_recipient(os.getenv("SUPERVISOR_EMAIL"))

    @classmethod
    def from_environment_for_recipient(
        cls,
        recipient: str | None,
    ) -> "SMTPEmailSender | None":
        host = os.getenv("SMTP_HOST")
        sender = os.getenv("SMTP_FROM_EMAIL")
        if not host or not sender or not recipient:
            return None
        try:
            port = int(os.getenv("SMTP_PORT", "587"))
        except ValueError:
            return None
        return cls(
            host=host,
            port=port,
            sender=sender,
            recipient=recipient,
            username=os.getenv("SMTP_USERNAME"),
            password=os.getenv("SMTP_PASSWORD"),
            use_tls=os.getenv("SMTP_USE_TLS", "1") == "1",
        )

    async def send(self, subject: str, body: str) -> None:
        await asyncio.to_thread(self._send_sync, subject, body)

    def _send_sync(self, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = self.recipient
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(self.host, self.port, timeout=15) as client:
            if self.use_tls:
                client.starttls()
            if self.username:
                client.login(self.username, self.password or "")
            client.send_message(message)


class EscalationService:
    def __init__(self, store: EscalationStore) -> None:
        self.store = store
        self.sender_factory = SMTPEmailSender.from_environment

    async def create(
        self,
        review: HumanReviewRecord,
        request: CreateHumanReviewRequest,
    ) -> EscalationAssignment:
        if review.field is None:
            raise EscalationError(422, "Escalation assignment requires a field.")
        assignment = self.store.create(
            EscalationAssignment(
                assignment_id=uuid4(),
                review_id=review.review_id,
                target_type=review.target_type,
                target_id=review.target_id,
                field=review.field,
                si_value=review.original_si_value,
                bl_value=review.original_bl_value,
                escalation_reason=review.escalation_reason or "",
                reviewer_action=(request.reviewer_action or "").strip(),
                requested_decision=(request.requested_decision or "").strip(),
                created_at=datetime.now(UTC),
            )
        )
        return assignment

    def history(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> EscalationAssignmentHistory:
        return EscalationAssignmentHistory(
            target_type=target_type,
            target_id=target_id,
            assignments=self.store.list(target_type, target_id),
        )

    async def _deliver(
        self,
        assignment: EscalationAssignment,
    ) -> EscalationAssignment:
        sender = self.sender_factory()
        if sender is None:
            return self.store.record_delivery(
                assignment.assignment_id,
                status=EscalationDeliveryStatus.NOT_CONFIGURED,
                attempted_at=datetime.now(UTC),
                supervisor_email=None,
                error_reason="Supervisor email delivery is not configured.",
            )
        try:
            await sender.send(
                f"Shipping document escalation: {assignment.field.value}",
                self._email_body(assignment),
            )
        except Exception:
            return self.store.record_delivery(
                assignment.assignment_id,
                status=EscalationDeliveryStatus.FAILED,
                attempted_at=datetime.now(UTC),
                supervisor_email=sender.recipient,
                error_reason="Supervisor email delivery failed.",
            )
        return self.store.record_delivery(
            assignment.assignment_id,
            status=EscalationDeliveryStatus.SENT,
            attempted_at=datetime.now(UTC),
            supervisor_email=sender.recipient,
        )

    @staticmethod
    def _email_body(assignment: EscalationAssignment) -> str:
        return "\n".join(
            (
                f"Target: {assignment.target_id}",
                f"Field: {assignment.field.value}",
                f"SI value: {assignment.si_value or '[missing]'}",
                f"BL value: {assignment.bl_value or '[missing]'}",
                f"Reason: {assignment.escalation_reason}",
                f"Reviewer action: {assignment.reviewer_action}",
                f"Requested decision: {assignment.requested_decision}",
            )
        )

    async def resend(self, assignment_id: UUID) -> EscalationAssignment:
        assignment = self.store.get(assignment_id)
        if assignment is None:
            raise EscalationError(404, "Escalation assignment not found.")
        if assignment.delivery_status is not EscalationDeliveryStatus.FAILED:
            raise EscalationError(
                409,
                "Only FAILED escalation email deliveries can be resent.",
            )
        return await self._deliver(assignment)
