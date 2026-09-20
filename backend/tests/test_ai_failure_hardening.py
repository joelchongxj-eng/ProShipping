import asyncio
import json

import httpx
import pytest

from app.models import CaseStatus
from app.services.ai_service import AIService
from app.services.processor import CaseProcessor

from tests.test_document_text import rendered_scan_pdf
from tests.test_extractor import BL_TEXT, SI_TEXT
from tests.test_processor import AttachmentInbox, make_pdf


def _groq_response(content: str) -> httpx.Response:
    return httpx.Response(
        200,
        json={"choices": [{"message": {"content": content}}]},
    )


def _scanned_inbox() -> AttachmentInbox:
    content = rendered_scan_pdf()
    return AttachmentInbox(
        {
            "attachments/email_failure_SI.pdf": content,
            "attachments/email_failure_BL.pdf": content,
        }
    )


def _partial_si_inbox() -> AttachmentInbox:
    partial_pdf = make_pdf(
        ((
            ("Shipper", "APRIL FAR EAST (M) SDN BHD"),
        ),)
    )
    return AttachmentInbox(
        {
            "attachments/email_partial_SI.pdf": partial_pdf,
            "attachments/email_partial_BL.txt": BL_TEXT.encode(),
        }
    )


def _vision_transcript_missing_weight() -> str:
    return "\n".join((*SI_TEXT.splitlines()[:-1], "Cargo Mass: 21,577 KG"))


@pytest.mark.parametrize(
    "failure",
    (
        pytest.param("connect_timeout", id="connect-timeout"),
        pytest.param("read_timeout", id="read-timeout"),
        pytest.param("network_error", id="network-error"),
        pytest.param(401, id="invalid-api-key"),
        pytest.param(429, id="rate-limit"),
        pytest.param(500, id="http-500"),
        pytest.param(502, id="http-502"),
        pytest.param(503, id="http-503"),
        pytest.param(504, id="http-504"),
    ),
)
async def test_vision_upstream_failures_return_safe_unreadable_review(
    failure: str | int,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal requests
        requests += 1
        if failure == "connect_timeout":
            raise httpx.ConnectTimeout("connection timed out", request=request)
        if failure == "read_timeout":
            raise httpx.ReadTimeout("read timed out", request=request)
        if failure == "network_error":
            raise httpx.ConnectError("connection reset", request=request)
        return httpx.Response(
            failure,
            request=request,
            json={"error": {"message": "upstream unavailable"}},
        )

    async def no_delay(seconds: float) -> None:
        return None

    monkeypatch.setattr(asyncio, "sleep", no_delay)
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    inbox = _scanned_inbox()
    try:
        case = await CaseProcessor(
            inbox,
            ai_service=AIService("test-key", client=client),
        ).process_email(inbox.email)
    finally:
        await client.aclose()

    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is not None
    assert case.review_reason.value == "unreadable"
    assert case.si_fields is None
    assert case.bl_fields is None
    assert case.comparison == []
    assert requests == (3 if failure == 503 else 1)


@pytest.mark.parametrize(
    "response",
    (
        pytest.param(httpx.Response(200, content=b"not-json"), id="non-json"),
        pytest.param(httpx.Response(200, json={"unexpected": "shape"}), id="invalid-shape"),
        pytest.param(_groq_response(""), id="empty-content"),
    ),
)
async def test_vision_malformed_responses_do_not_create_fields(
    response: httpx.Response,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            response.status_code,
            request=request,
            content=response.content,
            headers=response.headers,
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    inbox = _scanned_inbox()
    try:
        case = await CaseProcessor(
            inbox,
            ai_service=AIService("test-key", client=client),
        ).process_email(inbox.email)
    finally:
        await client.aclose()

    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is not None
    assert case.review_reason.value == "unreadable"
    assert case.si_fields is None
    assert case.bl_fields is None
    assert case.comparison == []


async def test_vision_failure_preserves_existing_deterministic_fields() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("read timed out", request=request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    inbox = _partial_si_inbox()
    try:
        case = await CaseProcessor(
            inbox,
            ai_service=AIService("test-key", client=client),
        ).process_email(inbox.email)
    finally:
        await client.aclose()

    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is not None
    assert case.review_reason.value == "missing_value"
    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.shipper.raw_value == "APRIL FAR EAST (M) SDN BHD"
    assert case.si_fields.consignee is None
    assert case.bl_fields is not None
    assert len(case.comparison) == 7


@pytest.mark.parametrize(
    "failure",
    (
        pytest.param("read_timeout", id="timeout"),
        pytest.param(429, id="rate-limit"),
        pytest.param(500, id="http-500"),
        pytest.param(502, id="http-502"),
        pytest.param(503, id="http-503"),
        pytest.param(504, id="http-504"),
        pytest.param("malformed_json", id="malformed-json"),
        pytest.param("invalid_schema", id="invalid-schema"),
    ),
)
async def test_structured_ai_failure_preserves_deterministic_fields(
    failure: str | int,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    gpt_requests = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal gpt_requests
        payload = json.loads(request.content)
        if payload["model"] == "qwen/qwen3.8-27b":
            return _groq_response(_vision_transcript_missing_weight())

        gpt_requests += 1
        if failure == "read_timeout":
            raise httpx.ReadTimeout("read timed out", request=request)
        if failure == "malformed_json":
            return _groq_response("not-json")
        if failure == "invalid_schema":
            return _groq_response(
                json.dumps(
                    {
                        "document_type": "SI",
                        "fields": {"gross_weight_kg": "not-a-field-object"},
                    }
                )
            )
        return httpx.Response(
            failure,
            request=request,
            json={"error": {"message": "upstream unavailable"}},
        )

    async def no_delay(seconds: float) -> None:
        return None

    monkeypatch.setattr(asyncio, "sleep", no_delay)
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    inbox = _partial_si_inbox()
    try:
        case = await CaseProcessor(
            inbox,
            ai_service=AIService("test-key", client=client),
        ).process_email(inbox.email)
    finally:
        await client.aclose()

    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is not None
    assert case.review_reason.value == "missing_value"
    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.shipper.raw_value == "APRIL FAR EAST (M) SDN BHD"
    assert case.si_fields.consignee is not None
    assert case.si_fields.gross_weight_kg is None
    assert case.bl_fields is not None
    assert len(case.comparison) == 7
    assert all(item.status.value != "match" for item in case.comparison if item.field == "gross_weight_kg")
    if failure == 503:
        assert gpt_requests == 3
    elif failure in {"malformed_json", "invalid_schema"}:
        assert gpt_requests == 2
    else:
        assert gpt_requests == 1
