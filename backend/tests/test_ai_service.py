import json

import httpx
import pytest

from app.models import EmailCategory, EmailRecord
from app.services.ai_service import AIService, AIResponseError


def service_reply(payloads):
    replies = iter(payloads)

    def handler(request):
        assert request.headers["x-goog-api-key"] == "test-key"
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
