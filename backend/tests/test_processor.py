import json

import httpx

from app.models import CaseStatus, EmailCategory, EmailRecord, ReviewReason
from app.services.ai_service import AIService
from app.services.processor import CaseProcessor

from tests.test_extractor import BL_TEXT, SI_TEXT


class FakeInbox:
    def __init__(self) -> None:
        self.email = EmailRecord(
            email_id="email_001",
            **{"from": "shipping@example.com"},
            subject="Please confirm SI and draft BL",
            body="Attached for checking.",
            attachments=["attachments/email_001_SI.txt", "attachments/email_001_BL.txt"],
        )

    async def list_emails(self) -> list[EmailRecord]:
        return [self.email]

    async def get_attachment(self, path: str) -> bytes:
        return SI_TEXT.encode() if "_SI." in path else BL_TEXT.encode()


async def test_processor_builds_a_complete_matching_case() -> None:
    processor = CaseProcessor(FakeInbox())
    cases = await processor.process_all()

    case = cases[0]
    assert case.category is EmailCategory.BL_COMPARISON
    assert case.status is CaseStatus.MATCH
    assert len(case.comparison) == 7


async def test_ai_detects_wrong_document_even_when_filename_says_bl() -> None:
    replies = iter([
        {"category": "BL_COMPARISON", "reason": "Check documents", "uncertain": False},
        {"document_type": "SI", "fields": {}},
        {"document_type": "OTHER", "fields": {}},
    ])

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(next(replies))}]}}]})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    case = await CaseProcessor(FakeInbox(), ai_service=AIService("test-key", client=client)).process_email(FakeInbox().email)
    assert case.category is EmailCategory.BL_COMPARISON
    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is ReviewReason.WRONG_DOC_TYPE


async def test_uncertain_ai_classification_never_auto_clears() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps({"category": "GENERAL", "reason": "Ambiguous request", "uncertain": True})}]}}]})

    inbox = FakeInbox()
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    case = await CaseProcessor(inbox, ai_service=AIService("test-key", client=client)).process_email(inbox.email)
    assert case.category is EmailCategory.GENERAL
    assert case.status is CaseStatus.NEEDS_REVIEW


async def test_ai_api_failure_is_visible_without_stopping_batch() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"error": "unavailable"})

    inbox = FakeInbox()
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    cases = await CaseProcessor(inbox, ai_service=AIService("test-key", client=client)).process_all()
    assert len(cases) == 1
    assert cases[0].status is CaseStatus.FAILED


async def test_ai_extraction_reaches_comparison_and_flags_container_difference() -> None:
    def extracted(text: str, document_type: str, count: str) -> dict:
        labels = {
            "shipper": ("Shipper/Exporter", "SHIPPER"),
            "consignee": ("CONSIGNEE", "CONSIGNEE"),
            "notify_party": ("NOTIFY PARTY", "Notify"),
            "port_of_loading": ("Port of Loading", "Port of Loading (POL)"),
            "port_of_discharge": ("Discharge Port", "POD"),
            "container_count": ("No. of Containers or Packages", "Container Count"),
            "gross_weight_kg": ("Gross Weight (KG)", "Gross Wt (kgs)"),
        }
        index = 0 if document_type == "SI" else 1
        fields = {}
        for name, pair in labels.items():
            line = next(line for line in text.splitlines() if line.startswith(pair[index] + ":"))
            value = line.split(":", 1)[1].strip()
            if name == "container_count":
                value = count
                line = f"{pair[index]}: {count}"
            fields[name] = {"raw_value": value, "evidence": line}
        return {"document_type": document_type, "fields": fields}

    replies = iter([
        {"category": "BL_COMPARISON", "reason": "Check SI and BL", "uncertain": False},
        extracted(SI_TEXT, "SI", "1 x 40'HC"),
        extracted(BL_TEXT, "BL", "4 x 40'HC"),
    ])

    class DifferentCountInbox(FakeInbox):
        async def get_attachment(self, path: str) -> bytes:
            text = SI_TEXT if "_SI." in path else BL_TEXT.replace("1 x 40'HC", "4 x 40'HC")
            return text.encode()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(next(replies))}]}}]})

    inbox = DifferentCountInbox()
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    case = await CaseProcessor(inbox, ai_service=AIService("test-key", client=client)).process_email(inbox.email)
    assert case.status is CaseStatus.MISMATCH
    assert [field.field for field in case.comparison if field.status.value == "mismatch"] == ["container_count"]

