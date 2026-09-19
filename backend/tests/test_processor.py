import json
from io import BytesIO

import httpx
import pytest
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.models import CaseStatus, EmailCategory, EmailRecord, ReviewReason, ShippingFields
from app.services.ai_models import Classification, DocumentType, ExtractedDocument
from app.services.ai_service import AIService
from app.services.processor import CaseProcessor

from tests.test_extractor import BL_TEXT, SI_TEXT
from tests.test_document_text import office_file


def pdf_with_text(text: str) -> bytes:
    writer = PdfWriter()
    page = writer.add_blank_page(width=300, height=300)
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/Font"): DictionaryObject({
            NameObject("/F1"): DictionaryObject({
                NameObject("/Type"): NameObject("/Font"),
                NameObject("/Subtype"): NameObject("/Type1"),
                NameObject("/BaseFont"): NameObject("/Helvetica"),
            })
        })
    })
    stream = DecodedStreamObject()
    stream.set_data(f"BT /F1 12 Tf 20 270 Td ({text}) Tj ET".encode())
    page[NameObject("/Contents")] = writer._add_object(stream)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def groq_reply(payload: dict) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(payload)}}]})


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
    class WrongDocumentInbox(FakeInbox):
        async def get_attachment(self, path: str) -> bytes:
            return SI_TEXT.encode() if "_SI." in path else b"INVOICE\nAmount: 100"

    replies = iter([
        {"category": "BL_COMPARISON", "reason": "Check documents", "uncertain": False},
        {"document_type": "SI", "fields": {}},
        {"document_type": "OTHER", "fields": {}},
    ])

    def handler(request: httpx.Request) -> httpx.Response:
        return groq_reply(next(replies))

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    inbox = WrongDocumentInbox()
    case = await CaseProcessor(inbox, ai_service=AIService("test-key", client=client)).process_email(inbox.email)
    assert case.category is EmailCategory.BL_COMPARISON
    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is ReviewReason.WRONG_DOC_TYPE


async def test_uncertain_ai_classification_never_auto_clears() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return groq_reply({"category": "GENERAL", "reason": "Ambiguous request", "uncertain": True})

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
        return groq_reply(next(replies))

    inbox = DifferentCountInbox()
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    case = await CaseProcessor(inbox, ai_service=AIService("test-key", client=client)).process_email(inbox.email)
    assert case.status is CaseStatus.MISMATCH
    assert [field.field for field in case.comparison if field.status.value == "mismatch"] == ["container_count"]


async def test_ai_extracts_text_pdf_pair_and_reports_container_mismatch() -> None:
    replies = iter([
        {"category": "BL_COMPARISON", "reason": "Compare files", "uncertain": False},
        {"document_type": "SI", "fields": {"container_count": {"raw_value": "1 x 40HC", "evidence": "Container Count: 1 x 40HC"}}},
        {"document_type": "BL", "fields": {"container_count": {"raw_value": "2 x 40HC", "evidence": "Container Count: 2 x 40HC"}}},
    ])

    def handler(request: httpx.Request) -> httpx.Response:
        return groq_reply(next(replies))

    class PdfInbox(FakeInbox):
        def __init__(self) -> None:
            super().__init__()
            self.email.attachments = [path.replace(".txt", ".pdf") for path in self.email.attachments]

        async def get_attachment(self, path: str) -> bytes:
            count = "1" if "_SI." in path else "2"
            return pdf_with_text(f"Container Count: {count} x 40HC")

    inbox = PdfInbox()
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    case = await CaseProcessor(inbox, ai_service=AIService("test-key", client=client)).process_email(inbox.email)
    assert case.status is CaseStatus.MISMATCH
    assert [field.field for field in case.comparison if field.status.value == "mismatch"] == ["container_count"]


async def test_ai_sends_pdf_without_extractable_text_to_review() -> None:
    class BlankPdfInbox(FakeInbox):
        def __init__(self) -> None:
            super().__init__()
            self.email.attachments = [path.replace(".txt", ".pdf") for path in self.email.attachments]

        async def get_attachment(self, path: str) -> bytes:
            return pdf_with_text("")

    class FakeAI:
        async def classify(self, email):
            return Classification(category=EmailCategory.BL_COMPARISON, reason="Compare", uncertain=False)

        async def extract_text(self, text, filename):
            pytest.fail("Empty PDF must not be sent to AI")

    inbox = BlankPdfInbox()
    case = await CaseProcessor(inbox, ai_service=FakeAI()).process_email(inbox.email)
    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is ReviewReason.UNREADABLE


@pytest.mark.parametrize("extension,member,xml", [
    ("docx", "word/document.xml", "<w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'><w:p><w:t>Container Count: 2</w:t></w:p></w:document>"),
    ("xlsx", "xl/worksheets/sheet1.xml", "<worksheet xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'><row><c t='inlineStr'><is><t>Container Count</t></is></c><c><v>2</v></c></row></worksheet>"),
])
async def test_ai_processes_office_attachments(extension, member, xml):
    seen = []

    class OfficeInbox(FakeInbox):
        def __init__(self):
            super().__init__()
            self.email.attachments = [path.replace(".txt", f".{extension}") for path in self.email.attachments]

        async def get_attachment(self, path):
            return office_file(member, xml)

    class FakeAI:
        async def classify(self, email):
            return Classification(category=EmailCategory.BL_COMPARISON, reason="Compare", uncertain=False)

        async def extract_text(self, text, filename):
            seen.append(text)
            kind = DocumentType.SI if "_SI." in filename else DocumentType.BL
            return ExtractedDocument(document_type=kind, fields=ShippingFields())

    inbox = OfficeInbox()
    case = await CaseProcessor(inbox, ai_service=FakeAI()).process_email(inbox.email)
    assert len(seen) == 2
    assert all("Container Count" in text for text in seen)
    assert case.review_reason is ReviewReason.MISSING_VALUE

