import asyncio
import os
import smtplib
from dataclasses import dataclass, field
from email.message import EmailMessage
from enum import StrEnum
from typing import Protocol
from urllib.parse import urlparse

import httpx


class EmailDeliveryConfigurationError(RuntimeError):
    pass


class EmailDeliveryStatus(StrEnum):
    SENT = "SENT"
    FAILED = "FAILED"
    NOT_CONFIGURED = "NOT_CONFIGURED"


@dataclass(frozen=True)
class EmailDeliveryResult:
    status: EmailDeliveryStatus
    error_reason: str | None = None
    provider_message_id: str | None = None


class EmailDeliveryService(Protocol):
    recipient: str

    async def send(
        self,
        subject: str,
        body: str,
        *,
        idempotency_key: str,
    ) -> EmailDeliveryResult: ...


@dataclass(frozen=True)
class NotConfiguredEmailDelivery:
    recipient: str
    error_reason: str

    async def send(
        self,
        subject: str,
        body: str,
        *,
        idempotency_key: str,
    ) -> EmailDeliveryResult:
        del subject, body, idempotency_key
        return EmailDeliveryResult(
            status=EmailDeliveryStatus.NOT_CONFIGURED,
            error_reason=self.error_reason,
        )


@dataclass(frozen=True)
class SMTPEmailDelivery:
    host: str
    port: int
    sender: str
    recipient: str
    username: str | None
    password: str | None = field(repr=False)
    use_tls: bool
    timeout_seconds: float = 15

    @classmethod
    def missing_configuration_keys(cls, recipient: str | None) -> list[str]:
        missing: list[str] = []
        host = _clean_env("SMTP_HOST")
        sender = _clean_env("SMTP_FROM_EMAIL") or _clean_env("EMAIL_FROM_ADDRESS")
        username = _clean_env("SMTP_USERNAME")
        password = _clean_env("SMTP_PASSWORD")
        if not host:
            missing.append("SMTP_HOST")
        if not sender:
            missing.append("SMTP_FROM_EMAIL or EMAIL_FROM_ADDRESS")
        if not recipient:
            missing.append("delivery recipient")
        if username and not password:
            missing.append("SMTP_PASSWORD")
        if password and not username:
            missing.append("SMTP_USERNAME")
        if _smtp_port() is None:
            missing.append("SMTP_PORT (must be an integer)")
        if _delivery_timeout() is None:
            missing.append("EMAIL_DELIVERY_TIMEOUT_SECONDS (must be positive)")
        return missing

    @classmethod
    def from_environment(cls, recipient: str) -> "SMTPEmailDelivery | None":
        if cls.missing_configuration_keys(recipient):
            return None
        host = _clean_env("SMTP_HOST")
        sender = _clean_env("SMTP_FROM_EMAIL") or _clean_env("EMAIL_FROM_ADDRESS")
        port = _smtp_port()
        timeout = _delivery_timeout()
        assert (
            host is not None
            and sender is not None
            and port is not None
            and timeout is not None
        )
        return cls(
            host=host,
            port=port,
            sender=sender,
            recipient=recipient,
            username=_clean_env("SMTP_USERNAME"),
            password=_clean_env("SMTP_PASSWORD"),
            use_tls=os.getenv("SMTP_USE_TLS", "1") == "1",
            timeout_seconds=timeout,
        )

    async def send(
        self,
        subject: str,
        body: str,
        *,
        idempotency_key: str,
    ) -> EmailDeliveryResult:
        del idempotency_key
        try:
            await asyncio.to_thread(self._send_sync, subject, body)
        except TimeoutError:
            return EmailDeliveryResult(
                status=EmailDeliveryStatus.FAILED,
                error_reason="SMTP delivery timed out.",
            )
        except Exception:
            return EmailDeliveryResult(
                status=EmailDeliveryStatus.FAILED,
                error_reason="Email delivery failed.",
            )
        return EmailDeliveryResult(status=EmailDeliveryStatus.SENT)

    def _send_sync(self, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = self.recipient
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(self.host, self.port, timeout=self.timeout_seconds) as client:
            if self.use_tls:
                client.starttls()
            if self.username:
                client.login(self.username, self.password or "")
            client.send_message(message)


@dataclass(frozen=True)
class HTTPSEmailDelivery:
    api_key: str = field(repr=False)
    api_base_url: str
    sender: str
    recipient: str
    timeout_seconds: float = 15
    transport: httpx.AsyncBaseTransport | None = field(default=None, repr=False)

    @classmethod
    def missing_configuration_keys(cls, recipient: str | None) -> list[str]:
        missing: list[str] = []
        if not _clean_env("EMAIL_API_KEY"):
            missing.append("EMAIL_API_KEY")
        if not _clean_env("EMAIL_FROM_ADDRESS"):
            missing.append("EMAIL_FROM_ADDRESS")
        if not recipient:
            missing.append("delivery recipient")
        if _delivery_timeout() is None:
            missing.append("EMAIL_DELIVERY_TIMEOUT_SECONDS (must be positive)")
        return missing

    @classmethod
    def from_environment(cls, recipient: str) -> "HTTPSEmailDelivery | None":
        if cls.missing_configuration_keys(recipient):
            return None
        api_key = _clean_env("EMAIL_API_KEY")
        sender = _clean_env("EMAIL_FROM_ADDRESS")
        timeout = _delivery_timeout()
        assert api_key is not None and sender is not None and timeout is not None
        return cls(
            api_key=api_key,
            api_base_url=os.getenv("EMAIL_API_BASE_URL", "https://api.resend.com").rstrip("/"),
            sender=sender,
            recipient=recipient,
            timeout_seconds=timeout,
        )

    async def send(
        self,
        subject: str,
        body: str,
        *,
        idempotency_key: str,
    ) -> EmailDeliveryResult:
        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                transport=self.transport,
            ) as client:
                response = await client.post(
                    f"{self.api_base_url}/emails",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Idempotency-Key": idempotency_key,
                    },
                    json={
                        "from": self.sender,
                        "to": [self.recipient],
                        "subject": subject,
                        "text": body,
                    },
                )
        except httpx.TimeoutException:
            return EmailDeliveryResult(
                status=EmailDeliveryStatus.FAILED,
                error_reason="Email provider request timed out.",
            )
        except httpx.RequestError:
            return EmailDeliveryResult(
                status=EmailDeliveryStatus.FAILED,
                error_reason="Email provider request failed.",
            )
        except Exception:
            return EmailDeliveryResult(
                status=EmailDeliveryStatus.FAILED,
                error_reason="Email provider request failed.",
            )
        if not 200 <= response.status_code < 300:
            return EmailDeliveryResult(
                status=EmailDeliveryStatus.FAILED,
                error_reason="Email provider rejected the delivery request.",
            )
        try:
            payload = response.json()
        except ValueError:
            payload = None
        provider_message_id = payload.get("id") if isinstance(payload, dict) else None
        if not isinstance(provider_message_id, str) or not provider_message_id.strip():
            return EmailDeliveryResult(
                status=EmailDeliveryStatus.FAILED,
                error_reason="Email provider returned an invalid response.",
            )
        return EmailDeliveryResult(
            status=EmailDeliveryStatus.SENT,
            provider_message_id=provider_message_id,
        )


def create_email_delivery(recipient: str) -> EmailDeliveryService:
    provider = os.getenv("EMAIL_PROVIDER", "smtp").strip().casefold()
    if provider == "https":
        delivery = HTTPSEmailDelivery.from_environment(recipient)
        missing = HTTPSEmailDelivery.missing_configuration_keys(recipient)
    elif provider == "smtp":
        delivery = SMTPEmailDelivery.from_environment(recipient)
        missing = SMTPEmailDelivery.missing_configuration_keys(recipient)
    else:
        return NotConfiguredEmailDelivery(
            recipient=recipient,
            error_reason="Email provider is not configured.",
        )
    if delivery is not None:
        return delivery
    detail = ", ".join(missing)
    return NotConfiguredEmailDelivery(
        recipient=recipient,
        error_reason=f"Email delivery is not configured. Missing configuration: {detail}.",
    )


def validate_email_delivery_configuration() -> None:
    provider_value = _clean_env("EMAIL_PROVIDER")
    provider = provider_value.casefold() if provider_value else None
    production = os.getenv("APP_ENV", "development").strip().casefold() == "production"
    problems: list[str] = []

    if provider is not None and provider not in {"smtp", "https"}:
        problems.append("EMAIL_PROVIDER must be 'smtp' or 'https'")
    if production and provider is None:
        problems.append("EMAIL_PROVIDER is required in production")
    if production and not _clean_env("OUTBOUND_EMAIL_AUTH_TOKEN"):
        problems.append("OUTBOUND_EMAIL_AUTH_TOKEN is required in production")
    if production and not _clean_env("SUPERVISOR_EMAIL"):
        problems.append("SUPERVISOR_EMAIL is required in production")

    selected = provider or "smtp"
    if selected == "https":
        problems.extend(
            HTTPSEmailDelivery.missing_configuration_keys("validation@example.invalid")
        )
        base_url = os.getenv("EMAIL_API_BASE_URL", "https://api.resend.com")
        if urlparse(base_url).scheme != "https":
            problems.append("EMAIL_API_BASE_URL must use HTTPS")
    elif selected == "smtp" and production:
        problems.extend(
            SMTPEmailDelivery.missing_configuration_keys("validation@example.invalid")
        )
        if os.getenv("SMTP_USE_TLS", "1") != "1":
            problems.append("SMTP_USE_TLS must be 1 in production")

    if problems:
        raise EmailDeliveryConfigurationError(
            "Invalid email delivery configuration: " + "; ".join(dict.fromkeys(problems))
        )


def _clean_env(name: str) -> str | None:
    value = os.getenv(name)
    cleaned = value.strip() if value is not None else None
    return cleaned or None


def _smtp_port() -> int | None:
    try:
        return int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        return None


def _delivery_timeout() -> float | None:
    try:
        value = float(os.getenv("EMAIL_DELIVERY_TIMEOUT_SECONDS", "15"))
    except ValueError:
        return None
    return value if value > 0 else None
