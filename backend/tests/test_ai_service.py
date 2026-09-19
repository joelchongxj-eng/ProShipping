import asyncio
import json

import httpx
import pytest

from app.models import EmailCategory, EmailRecord
from app.services.ai_service import AIService, AIResponseError


def service_reply(payloads):
    replies = iter(payloads)

    def handler(request):
        assert request.headers["x-goog-api-key"] == "test-key"
        assert json.loads(request.content)["generationConfig"] == {
            "responseFormat": {"text": {"mimeType": "APPLICATION_JSON"}}
        }
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(next(replies))}]}}]})

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


@pytest.mark.asyncio
async def test_classifies_email_into_existing_backend_category():
    client = service_reply([{"category": "BL_COMPARISON", "reason": "Asks to check SI against draft BL", "uncertain": False}])
    email = EmailRecord(email_id="email_001", **{"from": "person@example.com"}, subject="Please check documents", body="Compare the attached SI and BL", attachments=[])
    result = await AIService("test-key", client=client).classify(email)
    assert result.category is EmailCategory.BL_COMPARISON
    assert result.uncertain is False


@pytest.mark.asyncio
async def test_extracts_evidenced_values_and_normalizes_weight_locally():
    text = "SHIPPING INSTRUCTION\nGross Weight: 22 MT\nContainer Count: 3 x 40HC"
    fields = {name: None for name in ("shipper", "consignee", "notify_party", "port_of_loading", "port_of_discharge", "container_count", "gross_weight_kg")}
    fields["gross_weight_kg"] = {"raw_value": "22 MT", "evidence": "Gross Weight: 22 MT"}
    fields["container_count"] = {"raw_value": "3 x 40HC", "evidence": "Container Count: 3 x 40HC"}
    client = service_reply([{"document_type": "SI", "fields": fields}])
    result = await AIService("test-key", client=client).extract_text(text, "case_SI.txt")
    assert result.document_type == "SI"
    assert result.fields.gross_weight_kg.normalized_value == "22000"
    assert result.fields.container_count.normalized_value == "3"
    assert result.fields.shipper is None


@pytest.mark.asyncio
async def test_rejects_fabricated_evidence_after_one_retry():
    bad = {"document_type": "SI", "fields": {"shipper": {"raw_value": "Fake Co", "evidence": "Shipper: Fake Co"}}}
    client = service_reply([bad, bad])
    with pytest.raises(AIResponseError, match="evidence"):
        await AIService("test-key", client=client).extract_text("SHIPPING INSTRUCTION\nShipper: Real Co", "case_SI.txt")


@pytest.mark.asyncio
async def test_gemini_rejection_shows_reason_without_exposing_key():
    def handler(request):
        return httpx.Response(400, json={"error": {"message": "Bad setting for test-key"}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    email = EmailRecord(email_id="demo", **{"from": "demo@example.com"}, subject="Check BL", body="", attachments=[])
    with pytest.raises(ValueError, match=r"400.*Bad setting for \[REDACTED\]"):
        await AIService("test-key", client=client).classify(email)


@pytest.mark.asyncio
async def test_gemini_retries_temporary_503_then_returns_classification(monkeypatch):
    attempts = 0

    def handler(request):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(503, json={"error": {"message": "High demand"}})
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps({"category": "GENERAL", "reason": "Greeting", "uncertain": False})}]}}]})

    async def no_delay(seconds):
        pass

    monkeypatch.setattr(asyncio, "sleep", no_delay)
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    email = EmailRecord(email_id="demo", **{"from": "demo@example.com"}, subject="Hello", body="", attachments=[])
    result = await AIService("test-key", client=client).classify(email)

    assert result.category is EmailCategory.GENERAL
    assert attempts == 2
