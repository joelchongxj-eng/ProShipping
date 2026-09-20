import pytest

from app.models import (
    CaseStatus,
    ExtractedField,
    ShippingFields,
)
from app.services.ai_models import DocumentType, ExtractedDocument
from app.services.ai_service import GroqRequestError
from app.services.processor import CaseProcessor

from tests.test_document_text import image_pdf
from tests.test_extractor import BL_TEXT, SI_TEXT
from tests.test_processor import (
    AttachmentInbox,
    BL_DOCX,
    BL_XLSX,
    PDF_CONTENT,
    SI_XLSX,
)


class NeverCalledAI:
    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        pytest.fail("Readable documents must not use Groq vision.")

    async def extract_text(self, text: str, filename: str) -> ExtractedDocument:
        pytest.fail("Readable documents must not use Groq extraction.")


@pytest.mark.parametrize(
    "attachments",
    (
        pytest.param(
            {
                "attachments/email_supported_SI.txt": SI_TEXT.encode(),
                "attachments/email_supported_BL.txt": BL_TEXT.encode(),
            },
            id="txt",
        ),
        pytest.param(
            {
                "attachments/email_supported_SI.xlsx": SI_XLSX,
                "attachments/email_supported_BL.xlsx": BL_XLSX,
            },
            id="xlsx",
        ),
        pytest.param(
            {
                "attachments/email_supported_SI.docx": BL_DOCX,
                "attachments/email_supported_BL.docx": BL_DOCX,
            },
            id="docx",
        ),
        pytest.param(
            {
                "attachments/email_supported_SI.pdf": PDF_CONTENT,
                "attachments/email_supported_BL.pdf": PDF_CONTENT,
            },
            id="text-pdf",
        ),
    ),
)
async def test_readable_supported_documents_never_call_ai(
    attachments: dict[str, bytes],
) -> None:
    inbox = AttachmentInbox(attachments)

    case = await CaseProcessor(inbox, ai_service=NeverCalledAI()).process_email(
        inbox.email
    )

    assert case.status is CaseStatus.MATCH
    assert len(case.comparison) == 7


class VisionTranscriptAI:
    def __init__(self, transcript: str) -> None:
        self.transcript = transcript
        self.vision_calls = 0
        self.extraction_calls = 0

    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        assert image.startswith(b"\x89PNG")
        assert mime_type == "image/png"
        self.vision_calls += 1
        return self.transcript

    async def extract_text(self, text: str, filename: str) -> ExtractedDocument:
        self.extraction_calls += 1
        pytest.fail("Complete OCR text must use the deterministic extractor first.")


async def test_scanned_pdf_uses_vision_then_existing_deterministic_extractor() -> None:
    attachments = {
        "attachments/email_scan_SI.pdf": image_pdf(),
        "attachments/email_scan_BL.pdf": image_pdf(),
    }
    inbox = AttachmentInbox(attachments)
    ai = VisionTranscriptAI(SI_TEXT)

    case = await CaseProcessor(inbox, ai_service=ai).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert ai.vision_calls == 2
    assert ai.extraction_calls == 0
    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.shipper.source is not None
    assert case.si_fields.shipper.source.filename == "attachments/email_scan_SI.pdf"
    assert case.si_fields.shipper.source.evidence_text == case.si_fields.shipper.evidence
    assert case.si_fields.shipper.source.locator is None


class StructuredFallbackAI:
    def __init__(self) -> None:
        self.vision_calls = 0
        self.extraction_calls: list[str] = []

    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        self.vision_calls += 1
        return "SHIPPING DOCUMENT\nShipper ACME SHIPPING LTD"

    async def extract_text(self, text: str, filename: str) -> ExtractedDocument:
        self.extraction_calls.append(filename)
        return ExtractedDocument(
            document_type=(
                DocumentType.SI if "_SI." in filename else DocumentType.BL
            ),
            fields=ShippingFields(
                shipper=ExtractedField(
                    field="shipper",
                    raw_value="ACME SHIPPING LTD",
                    normalized_value="acme shipping ltd",
                    confidence=0.85,
                    page=None,
                    evidence="Shipper ACME SHIPPING LTD",
                )
            ),
        )


async def test_scanned_pdf_uses_structured_ai_only_for_fields_still_missing() -> None:
    attachments = {
        "attachments/email_scan_SI.pdf": image_pdf(),
        "attachments/email_scan_BL.pdf": image_pdf(),
    }
    inbox = AttachmentInbox(attachments)
    ai = StructuredFallbackAI()

    case = await CaseProcessor(inbox, ai_service=ai).process_email(inbox.email)

    assert case.status is CaseStatus.NEEDS_REVIEW
    assert ai.vision_calls == 2
    assert ai.extraction_calls == [
        "attachments/email_scan_SI.pdf",
        "attachments/email_scan_BL.pdf",
    ]
    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.shipper.source is not None
    assert case.si_fields.shipper.source.filename == "attachments/email_scan_SI.pdf"
    assert case.si_fields.shipper.source.evidence_text == "Shipper ACME SHIPPING LTD"
    assert case.si_fields.shipper.source.locator is None


class FailingVisionAI:
    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        raise GroqRequestError("Groq unavailable")

    async def extract_text(self, text: str, filename: str) -> ExtractedDocument:
        pytest.fail("Structured extraction must not run after vision failure.")


async def test_scanned_pdf_groq_failure_remains_unreadable_review() -> None:
    attachments = {
        "attachments/email_scan_SI.pdf": image_pdf(),
        "attachments/email_scan_BL.pdf": image_pdf(),
    }
    inbox = AttachmentInbox(attachments)

    case = await CaseProcessor(inbox, ai_service=FailingVisionAI()).process_email(
        inbox.email
    )

    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is not None
    assert case.review_reason.value == "unreadable"
    assert case.comparison == []
