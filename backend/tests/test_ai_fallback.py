import httpx
import pymupdf
import pytest

from app.models import (
    CaseStatus,
    ExtractedField,
    ShippingFields,
)
from app.services.ai_models import DocumentType, ExtractedDocument
from app.services.ai_service import GroqRequestError
from app.services.processor import CaseProcessor

from tests.test_document_text import image_pdf, png_image, rendered_scan_pdf
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
    assert case.si_fields.shipper.source.page == 1
    assert case.si_fields.shipper.source.evidence_text == case.si_fields.shipper.evidence
    assert case.si_fields.shipper.source.locator is None


def mixed_pdf(selectable_text: str) -> bytes:
    document = pymupdf.open()
    page = document.new_page(width=612, height=792)
    y = 30
    for line in selectable_text.splitlines():
        page.insert_text((30, y), line, fontsize=10)
        y += 18
    page.insert_image(
        pymupdf.Rect(400, 20, 500, 100),
        stream=png_image("navy", (100, 80)),
    )
    content = document.tobytes()
    document.close()
    return content


async def test_complete_mixed_text_and_image_pdf_does_not_call_vision() -> None:
    content = mixed_pdf(SI_TEXT)
    inbox = AttachmentInbox(
        {
            "attachments/email_mixed_SI.pdf": content,
            "attachments/email_mixed_BL.pdf": content,
        }
    )

    case = await CaseProcessor(inbox, ai_service=NeverCalledAI()).process_email(
        inbox.email
    )

    assert case.status is CaseStatus.MATCH
    assert len(case.comparison) == 7


async def test_incomplete_mixed_pdf_preserves_text_fields_and_fills_missing_from_vision() -> None:
    content = mixed_pdf("Shipper: SELECTABLE TEXT LTD")
    inbox = AttachmentInbox(
        {
            "attachments/email_mixed_SI.pdf": content,
            "attachments/email_mixed_BL.pdf": content,
        }
    )
    ai = VisionTranscriptAI(SI_TEXT)

    case = await CaseProcessor(inbox, ai_service=ai).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert ai.vision_calls == 2
    assert ai.extraction_calls == 0
    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.shipper.raw_value == "SELECTABLE TEXT LTD"
    assert case.si_fields.consignee is not None
    assert case.si_fields.shipper.source is not None
    assert case.si_fields.shipper.source.page == 1
    assert case.si_fields.shipper.source.locator is not None
    assert case.si_fields.shipper.source.locator.kind == "pdf"
    assert case.si_fields.consignee.source is not None
    assert case.si_fields.consignee.source.page == 1
    assert case.si_fields.consignee.source.locator is None


class OrderedPageVisionAI:
    def __init__(self) -> None:
        self.transcripts = [
            "\n".join(SI_TEXT.splitlines()[:4]),
            "\n".join(SI_TEXT.splitlines()[4:]),
        ] * 2
        self.calls = 0

    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        transcript = self.transcripts[self.calls]
        self.calls += 1
        return transcript

    async def extract_text(self, text: str, filename: str) -> ExtractedDocument:
        pytest.fail("Complete ordered transcripts must not use structured extraction.")


async def test_multi_page_scan_preserves_safe_page_attribution_without_bbox() -> None:
    content = rendered_scan_pdf(pages=2)
    inbox = AttachmentInbox(
        {
            "attachments/email_pages_SI.pdf": content,
            "attachments/email_pages_BL.pdf": content,
        }
    )
    ai = OrderedPageVisionAI()

    case = await CaseProcessor(inbox, ai_service=ai).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert ai.calls == 4
    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.gross_weight_kg is not None
    assert case.si_fields.shipper.source is not None
    assert case.si_fields.gross_weight_kg.source is not None
    assert case.si_fields.shipper.source.page == 1
    assert case.si_fields.gross_weight_kg.source.page == 2
    assert case.si_fields.shipper.source.locator is None
    assert case.si_fields.gross_weight_kg.source.locator is None


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


@pytest.mark.parametrize(
    "error",
    (
        GroqRequestError("Groq HTTP 401: invalid API key"),
        httpx.ReadTimeout("Vision request timed out"),
    ),
)
async def test_scanned_pdf_expected_vision_failures_are_safe(error: Exception) -> None:
    class ExpectedFailureAI:
        async def transcribe_image(self, image: bytes, mime_type: str) -> str:
            raise error

        async def extract_text(self, text: str, filename: str) -> ExtractedDocument:
            pytest.fail("Structured extraction must not run after vision failure.")

    attachments = {
        "attachments/email_scan_SI.pdf": rendered_scan_pdf(),
        "attachments/email_scan_BL.pdf": rendered_scan_pdf(),
    }
    inbox = AttachmentInbox(attachments)

    case = await CaseProcessor(
        inbox,
        ai_service=ExpectedFailureAI(),
    ).process_email(inbox.email)

    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is not None
    assert case.review_reason.value == "unreadable"
    assert case.si_fields is None
    assert case.bl_fields is None
    assert case.comparison == []


class MissingWeightStructuredAI:
    def __init__(self) -> None:
        self.vision_calls = 0
        self.extraction_calls = 0

    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        self.vision_calls += 1
        return "\n".join(
            (
                *SI_TEXT.splitlines()[:-1],
                "Cargo Mass: 21,577 KG",
            )
        )

    async def extract_text(self, text: str, filename: str) -> ExtractedDocument:
        self.extraction_calls += 1
        return ExtractedDocument(
            document_type=(
                DocumentType.SI if "_SI." in filename else DocumentType.BL
            ),
            fields=ShippingFields(
                shipper=ExtractedField(
                    field="shipper",
                    raw_value="MUST NOT OVERWRITE",
                    normalized_value="must not overwrite",
                    confidence=0.85,
                    page=None,
                    evidence="Shipper MUST NOT OVERWRITE",
                ),
                gross_weight_kg=ExtractedField(
                    field="gross_weight_kg",
                    raw_value="21,577 KG",
                    normalized_value="21577",
                    unit="kg",
                    confidence=0.85,
                    page=None,
                    evidence="Cargo Mass: 21,577 KG",
                ),
            ),
        )


async def test_rendered_vision_then_structured_ai_fills_only_missing_field() -> None:
    content = rendered_scan_pdf(images_per_page=2)
    inbox = AttachmentInbox(
        {
            "attachments/email_fallback_SI.pdf": content,
            "attachments/email_fallback_BL.pdf": content,
        }
    )
    ai = MissingWeightStructuredAI()

    case = await CaseProcessor(inbox, ai_service=ai).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert ai.vision_calls == 2
    assert ai.extraction_calls == 2
    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.gross_weight_kg is not None
    assert case.si_fields.shipper.raw_value != "MUST NOT OVERWRITE"
    assert case.si_fields.gross_weight_kg.raw_value == "21,577 KG"
    assert case.si_fields.gross_weight_kg.source is not None
    assert case.si_fields.gross_weight_kg.source.page == 1
    assert case.si_fields.gross_weight_kg.source.locator is None
    assert len(case.comparison) == 7


class AmbiguousWeightStructuredAI:
    def __init__(self) -> None:
        page_one = "\n".join(
            (
                *SI_TEXT.splitlines()[:-1],
                "Cargo Mass: 21,577 KG",
            )
        )
        page_two = "Cargo Mass: 21,577 KG"
        self.transcripts = [page_one, page_two] * 2
        self.vision_calls = 0
        self.extraction_calls = 0

    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        transcript = self.transcripts[self.vision_calls]
        self.vision_calls += 1
        return transcript

    async def extract_text(self, text: str, filename: str) -> ExtractedDocument:
        self.extraction_calls += 1
        return ExtractedDocument(
            document_type=(
                DocumentType.SI if "_SI." in filename else DocumentType.BL
            ),
            fields=ShippingFields(
                gross_weight_kg=ExtractedField(
                    field="gross_weight_kg",
                    raw_value="21,577 KG",
                    normalized_value="21577",
                    unit="kg",
                    confidence=0.85,
                    page=None,
                    evidence="Cargo Mass: 21,577 KG",
                ),
            ),
        )


async def test_structured_ai_does_not_guess_page_for_duplicated_evidence() -> None:
    content = rendered_scan_pdf(pages=2)
    inbox = AttachmentInbox(
        {
            "attachments/email_ambiguous_SI.pdf": content,
            "attachments/email_ambiguous_BL.pdf": content,
        }
    )
    ai = AmbiguousWeightStructuredAI()

    case = await CaseProcessor(inbox, ai_service=ai).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert ai.vision_calls == 4
    assert ai.extraction_calls == 2
    assert case.si_fields is not None
    assert case.si_fields.gross_weight_kg is not None
    assert case.si_fields.gross_weight_kg.source is not None
    assert case.si_fields.gross_weight_kg.source.evidence_text == (
        "Cargo Mass: 21,577 KG"
    )
    assert case.si_fields.gross_weight_kg.source.page is None
    assert case.si_fields.gross_weight_kg.source.locator is None
