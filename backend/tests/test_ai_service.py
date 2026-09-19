import asyncio
import json

import httpx
import pytest

from app.models import EmailCategory, EmailRecord
from app.services.ai_service import AIService, AIResponseError


def service_reply(payloads):
    replies = iter(payloads)

    def handler(request):
        assert request.url == "https://api.groq.com/openai/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer test-key"
        payload = json.loads(request.content)
        assert payload["model"] == "openai/gpt-oss-20b"
        response_format = payload["response_format"]
        assert response_format["type"] == "json_schema"
        assert response_format["json_schema"]["strict"] is True
        schema = response_format["json_schema"]["schema"]
        assert schema["additionalProperties"] is False
        assert set(schema["properties"]) == set(schema["required"])
        if "fields" in schema["properties"]:
            fields = schema["properties"]["fields"]
            assert len(fields["required"]) == 7
            assert fields["additionalProperties"] is False
            assert payload["max_completion_tokens"] == 4096
            assert payload["reasoning_effort"] == "low"
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(next(replies))}}]})

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


@pytest.mark.asyncio
@pytest.mark.parametrize("message", [
    "Failed to validate JSON. Please adjust your prompt.",
    "Failed to generate JSON. Please adjust your prompt.",
])
async def test_retries_groq_json_validation_failure_without_response_format(message):
    requests = []

    def handler(request):
        payload = json.loads(request.content)
        requests.append(payload)
        if len(requests) == 1:
            return httpx.Response(400, json={"error": {"message": message}})
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({
            "category": "GENERAL", "reason": "Greeting", "uncertain": False,
        })}}]})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    email = EmailRecord(email_id="demo", **{"from": "demo@example.com"}, subject="Hello", body="", attachments=[])
    result = await AIService("test-key", client=client).classify(email)
    assert result.category is EmailCategory.GENERAL
    assert requests[0]["response_format"]["type"] == "json_schema"
    assert "response_format" not in requests[1]


@pytest.mark.asyncio
async def test_retries_groq_short_rate_limit():
    requests = []

    def handler(request):
        requests.append(request)
        if len(requests) == 1:
            return httpx.Response(429, json={"error": {"message": "Please try again in 0.001s."}})
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({
            "category": "GENERAL", "reason": "Greeting", "uncertain": False,
        })}}]})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    email = EmailRecord(email_id="demo", **{"from": "demo@example.com"}, subject="Hello", body="", attachments=[])
    result = await AIService("test-key", client=client).classify(email)
    assert result.category is EmailCategory.GENERAL
    assert len(requests) == 2


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
async def test_complete_labeled_office_document_uses_deterministic_fields():
    text = """BILL OF LADING (DRAFT)
Shipper (Principal or Seller): APRIL FINE PAPER TRADING | 77 ROBINSON ROAD
Consignee: AL GURG STATIONERY LLC | P.O. BOX 5069
Notify: AL GURG STATIONERY LLC | P.O. BOX 5069
PORT OF LOADING: SINGAPORE
POD: KARACHI, PAKISTAN
Total Containers: 12 x 20'FCL
Gross Wt (kgs): 243,588
"""

    def unexpected_request(request):
        raise AssertionError("Complete labeled Office document should not call Groq")

    client = httpx.AsyncClient(transport=httpx.MockTransport(unexpected_request))
    result = await AIService("test-key", client=client).extract_text(text, "email_055_BL.docx")
    assert result.document_type == "BL"
    assert result.fields.shipper.raw_value == "APRIL FINE PAPER TRADING | 77 ROBINSON ROAD"
    assert result.fields.container_count.normalized_value == "12"
    assert result.fields.gross_weight_kg.normalized_value == "243588"
    assert all(value.page is None for _, value in result.fields)


@pytest.mark.asyncio
async def test_partial_office_document_keeps_labeled_values_over_model_guess():
    text = "BILL OF LADING (DRAFT)\nShipper: ACME PAPER\nConsignee: OTHER COMPANY"
    client = service_reply([{"document_type": "BL", "fields": {
        "shipper": {"raw_value": "OTHER COMPANY", "evidence": "Consignee: OTHER COMPANY"},
    }}])
    result = await AIService("test-key", client=client).extract_text(text, "partial_BL.docx")
    assert result.fields.shipper.raw_value == "ACME PAPER"
    assert result.fields.shipper.evidence == "Shipper: ACME PAPER"
    assert result.fields.consignee.raw_value == "OTHER COMPANY"


@pytest.mark.asyncio
async def test_extracts_flat_groq_fields_when_evidence_is_exact():
    text = "BILL OF LADING INSTRUCTION\nContainer Count: 6 x 40'HC"
    reply = {
        "document_type": "SI",
        "container_count": {"raw_value": "6 x 40'HC", "evidence": "Container Count: 6 x 40'HC"},
    }
    client = service_reply([reply, reply])
    result = await AIService("test-key", client=client).extract_text(text, "email_059_SI.pdf")
    assert result.document_type == "SI"
    assert result.fields.container_count.normalized_value == "6"


@pytest.mark.asyncio
async def test_explicit_bill_of_lading_heading_overrides_wrong_model_type():
    text = "ASIA PACIFIC PAPERBOARD TRADING\nBILL OF LADING: 3154303911\nContainer Count: 15"
    client = service_reply([{"document_type": "SI", "fields": {
        "container_count": {"raw_value": "15", "evidence": "Container Count: 15"},
    }}])
    result = await AIService("test-key", client=client).extract_text(text, "email_005_BL.xlsx")
    assert result.document_type == "BL"


@pytest.mark.asyncio
async def test_bill_of_lading_instruction_heading_is_si():
    text = "BILL OF LADING INSTRUCTION\nContainer Count: 6"
    client = service_reply([{"document_type": "BL", "fields": {
        "container_count": {"raw_value": "6", "evidence": "Container Count: 6"},
    }}])
    result = await AIService("test-key", client=client).extract_text(text, "email_059_SI.pdf")
    assert result.document_type == "SI"


@pytest.mark.asyncio
async def test_separates_notify_party_from_explicit_loading_port_label():
    text = "NOTIFY PARTY\nPACIFIC OFFICE\nPOL\nBUATAN, INDONESIA\nPort of Discharge\nFREMANTLE, AUSTRALIA"
    client = service_reply([{"document_type": "SI", "fields": {
        "notify_party": {
            "raw_value": "PACIFIC OFFICE\nPOL\nBUATAN, INDONESIA",
            "evidence": "NOTIFY PARTY\nPACIFIC OFFICE\nPOL\nBUATAN, INDONESIA",
        },
        "port_of_loading": None,
    }}])
    result = await AIService("test-key", client=client).extract_text(text, "email_059_SI.pdf")
    assert result.fields.notify_party.raw_value == "PACIFIC OFFICE"
    assert result.fields.port_of_loading.raw_value == "BUATAN, INDONESIA"


@pytest.mark.asyncio
async def test_notify_party_uses_its_own_labeled_block_not_consignee_address():
    text = (
        "BILL OF LADING (DRAFT)\n"
        "Consignee: VITAL SOLUTIONS PTE. LTD.\n  77 ROBINSON ROAD, SINGAPORE\n"
        "Notify Party: VITAL SOLUTIONS PTE. LTD.\n"
        "Port of Loading: NHAVA SHEVA"
    )
    wrong = "VITAL SOLUTIONS PTE. LTD.\n  77 ROBINSON ROAD, SINGAPORE"
    client = service_reply([{"document_type": "BL", "fields": {
        "notify_party": {"raw_value": wrong, "evidence": "Consignee: " + wrong},
    }}])
    result = await AIService("test-key", client=client).extract_text(text, "email_031_BL.txt")
    assert result.fields.notify_party.raw_value == "VITAL SOLUTIONS PTE. LTD."
    assert result.fields.notify_party.evidence == "Notify Party: VITAL SOLUTIONS PTE. LTD."


@pytest.mark.asyncio
async def test_removes_field_labels_from_model_values_but_keeps_source_evidence():
    lines = {
        "shipper": "Shipper/Exporter: APRIL FINE PAPER TRADING",
        "consignee": "Consignee: ORIENT LINKS CO (LLC)",
        "notify_party": "Notify Party/Intermediate Consignee: VITAL SOLUTIONS PTE. LTD.",
        "port_of_loading": "Port of Loading: NHAVA SHEVA, INDIA (INNSA)",
        "port_of_discharge": "POD: CALLAO, PERU (PECLL)",
    }
    text = "BILL OF LADING (DRAFT)\n" + "\n".join(lines.values())
    fields = {name: {"raw_value": line, "evidence": line} for name, line in lines.items()}
    client = service_reply([{"document_type": "BL", "fields": fields}])
    result = await AIService("test-key", client=client).extract_text(text, "email_091_BL.txt")
    for name, line in lines.items():
        field = getattr(result.fields, name)
        assert field.raw_value == line.split(": ", 1)[1]
        assert field.evidence == line


@pytest.mark.asyncio
async def test_separates_shipper_from_to_the_order_of_consignee():
    text = (
        "Shipper (Principal or Seller): APRIL FINE PAPER TRADING\n"
        "  77 ROBINSON ROAD, SINGAPORE\n"
        "To the Order of: ORIENT LINKS CO (LLC)\n"
        "  P.O. BOX 61041, DUBAI\n"
        "NOTIFY PARTY: VITAL SOLUTIONS PTE LTD"
    )
    shipper = "APRIL FINE PAPER TRADING\n  77 ROBINSON ROAD, SINGAPORE\nTo the Order of: ORIENT LINKS CO (LLC)\n  P.O. BOX 61041, DUBAI"
    client = service_reply([{"document_type": "SI", "fields": {
        "shipper": {"raw_value": shipper, "evidence": text[:text.index("\nNOTIFY PARTY")]},
        "consignee": None,
    }}])
    result = await AIService("test-key", client=client).extract_text(text, "email_091_SI.txt")
    assert result.fields.shipper.raw_value == "APRIL FINE PAPER TRADING\n  77 ROBINSON ROAD, SINGAPORE"
    assert result.fields.consignee.raw_value == "ORIENT LINKS CO (LLC)\n  P.O. BOX 61041, DUBAI"


@pytest.mark.asyncio
async def test_rejects_fabricated_evidence_after_one_retry():
    bad = {"document_type": "SI", "fields": {"shipper": {"raw_value": "Fake Co", "evidence": "Shipper: Fake Co"}}}
    client = service_reply([bad, bad])
    with pytest.raises(AIResponseError, match="evidence"):
        await AIService("test-key", client=client).extract_text("SHIPPING INSTRUCTION\nShipper: Real Co", "case_SI.txt")


@pytest.mark.asyncio
async def test_groq_rejection_shows_reason_without_exposing_key():
    def handler(request):
        return httpx.Response(400, json={"error": {"message": "Bad setting for test-key"}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    email = EmailRecord(email_id="demo", **{"from": "demo@example.com"}, subject="Check BL", body="", attachments=[])
    with pytest.raises(ValueError, match=r"Groq HTTP 400.*Bad setting for \[REDACTED\]"):
        await AIService("test-key", client=client).classify(email)


@pytest.mark.asyncio
async def test_groq_retries_temporary_503_then_returns_classification(monkeypatch):
    attempts = 0

    def handler(request):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(503, json={"error": {"message": "High demand"}})
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({"category": "GENERAL", "reason": "Greeting", "uncertain": False})}}]})

    async def no_delay(seconds):
        pass

    monkeypatch.setattr(asyncio, "sleep", no_delay)
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    email = EmailRecord(email_id="demo", **{"from": "demo@example.com"}, subject="Hello", body="", attachments=[])
    result = await AIService("test-key", client=client).classify(email)

    assert result.category is EmailCategory.GENERAL
    assert attempts == 2


@pytest.mark.asyncio
async def test_transcribes_scan_with_groq_vision_using_same_key():
    def handler(request):
        assert request.headers["Authorization"] == "Bearer test-key"
        payload = json.loads(request.content)
        assert payload["model"] == "qwen/qwen3.8-27b"
        assert payload["reasoning_effort"] == "none"
        content = payload["messages"][0]["content"]
        assert content[1]["image_url"]["url"] == "data:image/png;base64,iVBORw=="
        return httpx.Response(200, json={"choices": [{"message": {"content": "SHIPPING INSTRUCTION\nContainer Count: 2"}}]})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    text = await AIService("test-key", client=client).transcribe_image(b"\x89PNG", "image/png")
    assert text == "SHIPPING INSTRUCTION\nContainer Count: 2"


@pytest.mark.asyncio
async def test_vision_refuses_empty_transcription():
    def handler(request):
        return httpx.Response(200, json={"choices": [{"message": {"content": "UNREADABLE"}}]})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with pytest.raises(AIResponseError, match="unreadable"):
        await AIService("test-key", client=client).transcribe_image(b"\x89PNG", "image/png")
