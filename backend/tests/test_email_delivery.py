from __future__ import annotations

import json

import httpx
import pytest

from app.email_delivery import (
    EmailDeliveryConfigurationError,
    EmailDeliveryStatus,
    HTTPSEmailDelivery,
    SMTPEmailDelivery,
    create_email_delivery,
    validate_email_delivery_configuration,
)


@pytest.mark.asyncio
async def test_smtp_adapter_returns_normalized_sent_result(monkeypatch) -> None:
    sent: list[tuple[str, int, int, str, str, str]] = []

    class FakeSMTP:
        def __init__(self, host: str, port: int, timeout: int) -> None:
            self.host = host
            self.port = port
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, *_args) -> None:
            return None

        def starttls(self) -> None:
            return None

        def login(self, _username: str, _password: str) -> None:
            return None

        def send_message(self, message) -> None:
            sent.append(
                (
                    self.host,
                    self.port,
                    self.timeout,
                    message["From"],
                    message["To"],
                    message["Subject"],
                )
            )

    monkeypatch.setattr("app.email_delivery.smtplib.SMTP", FakeSMTP)
    delivery = SMTPEmailDelivery(
        host="smtp.example.com",
        port=587,
        sender="system@example.com",
        recipient="recipient@example.com",
        username="account@example.com",
        password="secret",
        use_tls=True,
        timeout_seconds=9,
    )

    result = await delivery.send("Subject", "Body", idempotency_key="ignored-by-smtp")

    assert result.status is EmailDeliveryStatus.SENT
    assert result.provider_message_id is None
    assert result.error_reason is None
    assert sent == [
        (
            "smtp.example.com",
            587,
            9,
            "system@example.com",
            "recipient@example.com",
            "Subject",
        )
    ]


@pytest.mark.asyncio
async def test_https_adapter_sends_resend_request_and_returns_provider_message_id() -> None:
    observed: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        observed["headers"] = dict(request.headers)
        observed["json"] = json.loads(request.content)
        return httpx.Response(200, json={"id": "provider-message-123"})

    delivery = HTTPSEmailDelivery(
        api_key="provider-secret",
        api_base_url="https://api.resend.test",
        sender="system@example.com",
        recipient="recipient@example.com",
        timeout_seconds=7,
        transport=httpx.MockTransport(handler),
    )

    result = await delivery.send("Subject", "Body", idempotency_key="dispatch/message")

    assert result.status is EmailDeliveryStatus.SENT
    assert result.provider_message_id == "provider-message-123"
    assert result.error_reason is None
    assert observed["json"] == {
        "from": "system@example.com",
        "to": ["recipient@example.com"],
        "subject": "Subject",
        "text": "Body",
    }
    headers = observed["headers"]
    assert isinstance(headers, dict)
    assert headers["authorization"] == "Bearer provider-secret"
    assert headers["idempotency-key"] == "dispatch/message"


@pytest.mark.asyncio
async def test_https_adapter_sanitizes_timeout() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("provider-secret timeout detail", request=request)

    delivery = HTTPSEmailDelivery(
        api_key="provider-secret",
        api_base_url="https://api.resend.test",
        sender="system@example.com",
        recipient="recipient@example.com",
        timeout_seconds=3,
        transport=httpx.MockTransport(handler),
    )

    result = await delivery.send("Subject", "Body", idempotency_key="dispatch/message")

    assert result.status is EmailDeliveryStatus.FAILED
    assert result.error_reason == "Email provider request timed out."
    assert "provider-secret" not in str(result)


@pytest.mark.parametrize("status_code", [400, 429, 500, 503])
@pytest.mark.asyncio
async def test_https_adapter_sanitizes_provider_http_failures(status_code: int) -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json={"message": "provider-secret detail"})

    delivery = HTTPSEmailDelivery(
        api_key="provider-secret",
        api_base_url="https://api.resend.test",
        sender="system@example.com",
        recipient="recipient@example.com",
        timeout_seconds=3,
        transport=httpx.MockTransport(handler),
    )

    result = await delivery.send("Subject", "Body", idempotency_key="dispatch/message")

    assert result.status is EmailDeliveryStatus.FAILED
    assert result.error_reason == "Email provider rejected the delivery request."
    assert "provider-secret" not in str(result)


@pytest.mark.parametrize(
    "response",
    (
        httpx.Response(200, content=b"not-json"),
        httpx.Response(200, json={}),
        httpx.Response(200, json={"id": 123}),
    ),
)
@pytest.mark.asyncio
async def test_https_adapter_rejects_malformed_success_response(
    response: httpx.Response,
) -> None:
    delivery = HTTPSEmailDelivery(
        api_key="provider-secret",
        api_base_url="https://api.resend.test",
        sender="system@example.com",
        recipient="recipient@example.com",
        timeout_seconds=3,
        transport=httpx.MockTransport(lambda _request: response),
    )

    result = await delivery.send("Subject", "Body", idempotency_key="dispatch/message")

    assert result.status is EmailDeliveryStatus.FAILED
    assert result.error_reason == "Email provider returned an invalid response."
    assert result.provider_message_id is None


def test_provider_selection_uses_https_configuration(monkeypatch) -> None:
    monkeypatch.setenv("EMAIL_PROVIDER", "https")
    monkeypatch.setenv("EMAIL_API_KEY", "provider-secret")
    monkeypatch.setenv("EMAIL_FROM_ADDRESS", "system@example.com")
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.resend.test")

    delivery = create_email_delivery("recipient@example.com")

    assert isinstance(delivery, HTTPSEmailDelivery)
    assert "provider-secret" not in repr(delivery)


def test_provider_selection_defaults_to_smtp_for_local_development(monkeypatch) -> None:
    monkeypatch.delenv("EMAIL_PROVIDER", raising=False)
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "system@example.com")

    delivery = create_email_delivery("recipient@example.com")

    assert isinstance(delivery, SMTPEmailDelivery)


def test_production_requires_explicit_secure_email_configuration(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("EMAIL_PROVIDER", raising=False)
    monkeypatch.delenv("OUTBOUND_EMAIL_AUTH_TOKEN", raising=False)

    with pytest.raises(EmailDeliveryConfigurationError) as exc_info:
        validate_email_delivery_configuration()

    message = str(exc_info.value)
    assert "EMAIL_PROVIDER" in message
    assert "OUTBOUND_EMAIL_AUTH_TOKEN" in message


def test_production_https_requires_key_and_from_address_without_exposing_values(
    monkeypatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("EMAIL_PROVIDER", "https")
    monkeypatch.setenv("EMAIL_API_KEY", "provider-secret")
    monkeypatch.delenv("EMAIL_FROM_ADDRESS", raising=False)
    monkeypatch.setenv("OUTBOUND_EMAIL_AUTH_TOKEN", "proxy-secret")

    with pytest.raises(EmailDeliveryConfigurationError) as exc_info:
        validate_email_delivery_configuration()

    message = str(exc_info.value)
    assert "EMAIL_FROM_ADDRESS" in message
    assert "provider-secret" not in message
    assert "proxy-secret" not in message


def test_production_requires_supervisor_routing_configuration(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("EMAIL_PROVIDER", "https")
    monkeypatch.setenv("EMAIL_API_KEY", "provider-secret")
    monkeypatch.setenv("EMAIL_FROM_ADDRESS", "system@example.com")
    monkeypatch.setenv("OUTBOUND_EMAIL_AUTH_TOKEN", "proxy-secret")
    monkeypatch.delenv("SUPERVISOR_EMAIL", raising=False)

    with pytest.raises(EmailDeliveryConfigurationError) as exc_info:
        validate_email_delivery_configuration()

    assert "SUPERVISOR_EMAIL" in str(exc_info.value)


def test_production_smtp_rejects_disabled_tls(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("EMAIL_PROVIDER", "smtp")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "system@example.com")
    monkeypatch.setenv("SMTP_USE_TLS", "0")
    monkeypatch.setenv("OUTBOUND_EMAIL_AUTH_TOKEN", "proxy-secret")

    with pytest.raises(EmailDeliveryConfigurationError) as exc_info:
        validate_email_delivery_configuration()

    assert "SMTP_USE_TLS" in str(exc_info.value)
