from io import BytesIO

import pymupdf
import pytest
from docx import Document
from openpyxl import Workbook

from app.models import CaseStatus, EmailCategory, EmailRecord, ShippingFields
from app.services.document_reader import document_to_text, read_document
from app.services.processor import CaseProcessor
from app.services.text_extractor import extract_shipping_fields

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


class AttachmentInbox:
    def __init__(self, attachments: dict[str, bytes]) -> None:
        self.attachments = attachments
        self.email = EmailRecord(
            email_id="email_xlsx",
            **{"from": "shipping@example.com"},
            subject="Please confirm SI and draft BL",
            body="Attached for checking.",
            attachments=list(attachments),
        )

    async def list_emails(self) -> list[EmailRecord]:
        return [self.email]

    async def get_attachment(self, path: str) -> bytes:
        return self.attachments[path]


def make_xlsx(labels: tuple[str, ...], sheet_name: str = "Sheet") -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = sheet_name
    values: tuple[str | int, ...] = (
        "APRIL FAR EAST (M) SDN BHD",
        "MOORIM SP CO., LTD",
        "UAB NOVAKOPA",
        "PORT KLANG, MALAYSIA",
        "CALLAO, PERU",
        3,
        21577,
    )
    for row, (label, value) in enumerate(zip(labels, values, strict=True), start=4):
        worksheet.cell(row=row, column=1, value=label)
        worksheet.cell(row=row, column=2, value=value)
    content = BytesIO()
    workbook.save(content)
    workbook.close()
    return content.getvalue()


SI_XLSX = make_xlsx(
    (
        "Shipper/Exporter",
        "Consignee (Non-Negotiable)",
        "Notify Party",
        "Port of Loading",
        "Port of Discharge",
        "No. of Containers",
        "Gross Weight (KG)",
    )
)

BL_XLSX = make_xlsx(
    (
        "Shipper",
        "Consignee",
        "Notify",
        "POL",
        "POD",
        "Container Count",
        "Gross Wt (KGS)",
    )
)


DOCX_LABELS = (
    "Shipper (Principal or Seller) (发货人)",
    "Consignee (Non-Negotiable) (收货人)",
    "Notify Party/Intermediate Consignee (通知人)",
    "Port of Loading (装货港)",
    "Port of Discharge (POD) (卸货港)",
    "No. of Containers (箱数)",
    "Gross Weight毛重(KGS) (毛重 KGS)",
)

DOCX_VALUES: tuple[str | tuple[str, ...], ...] = (
    "APRIL FAR EAST (M) SDN BHD",
    "MOORIM SP CO., LTD",
    "UAB NOVAKOPA",
    "PORT KLANG, MALAYSIA",
    "CALLAO, PERU",
    "3",
    "21,577 KG",
)


def make_docx(values: tuple[str | tuple[str, ...], ...] = DOCX_VALUES) -> bytes:
    document = Document()
    table = document.add_table(rows=0, cols=2)
    for label, value in zip(DOCX_LABELS, values, strict=True):
        label_cell, value_cell = table.add_row().cells
        label_cell.text = label
        paragraphs = (value,) if isinstance(value, str) else value
        value_cell.text = paragraphs[0]
        for paragraph in paragraphs[1:]:
            value_cell.add_paragraph(paragraph)
    content = BytesIO()
    document.save(content)
    return content.getvalue()


def make_paragraph_docx(
    shipper: str = "ACME SHIPPING LTD",
    duplicate_shipper: bool = False,
) -> bytes:
    document = Document()
    document.add_paragraph("SHIPPING INSTRUCTION")
    rows = (
        ("Shipper", shipper),
        ("Consignee", "ACME IMPORTS LTD"),
        ("Notify Party", "ACME NOTIFY LTD"),
        ("Port of Loading", "PORT KLANG, MALAYSIA"),
        ("Port of Discharge", "CALLAO, PERU"),
        ("Container Count", "3"),
        ("Gross Weight (KG)", "21,577 KG"),
    )
    for label, value in rows:
        document.add_paragraph(f"{label}: {value}")
        if duplicate_shipper and label == "Shipper":
            document.add_paragraph(f"{label}: {value}")
    content = BytesIO()
    document.save(content)
    return content.getvalue()


BL_DOCX = make_docx()


PDF_ROWS: tuple[tuple[str, str], ...] = (
    ("Shipper", "APRIL FAR EAST (M) SDN BHD"),
    ("Consignee", "MOORIM SP CO., LTD"),
    ("Notify Party", "UAB NOVAKOPA"),
    ("Port of Loading", "PORT KLANG, MALAYSIA"),
    ("Port of Discharge", "CALLAO, PERU"),
    ("Container Count", "3 x 40'HC"),
    ("Gross Weight (KG)", "21,577 KG"),
)


def make_pdf(
    pages: tuple[tuple[tuple[str, str], ...], ...] = (PDF_ROWS,),
) -> bytes:
    document = pymupdf.open()
    for rows in pages:
        page = document.new_page()
        y = 72
        for label, value in rows:
            page.insert_text((56, y), label)
            page.insert_text((220, y), value)
            y += 24
    content = document.tobytes()
    document.close()
    return content


PDF_CONTENT = make_pdf()


def make_xlsx_inbox() -> AttachmentInbox:
    return AttachmentInbox(
        {
            "attachments/email_xlsx_SI.xlsx": SI_XLSX,
            "attachments/email_xlsx_BL.xlsx": BL_XLSX,
        }
    )


def make_xlsx_docx_inbox() -> AttachmentInbox:
    return AttachmentInbox(
        {
            "attachments/email_xlsx_SI.xlsx": SI_XLSX,
            "attachments/email_xlsx_BL.docx": BL_DOCX,
        }
    )


def make_txt_inbox(bl_text: str, si_text: str = SI_TEXT) -> AttachmentInbox:
    return AttachmentInbox(
        {
            "attachments/email_txt_SI.txt": si_text.encode(),
            "attachments/email_txt_BL.txt": bl_text.encode(),
        }
    )


async def test_processor_builds_a_complete_matching_case() -> None:
    processor = CaseProcessor(FakeInbox())
    cases = await processor.process_all()

    case = cases[0]
    assert case.category is EmailCategory.BL_COMPARISON
    assert case.status is CaseStatus.MATCH
    assert case.review_reason is None
    assert len(case.comparison) == 7


@pytest.mark.parametrize(
    "wrong_document",
    (
        "COMMERCIAL INVOICE\nSeller: ACME EXPORTS\nBuyer: ACME IMPORTS",
        "PACKING LIST\nShipper: ACME EXPORTS\nConsignee: ACME IMPORTS",
        "CERTIFICATE OF ORIGIN\nExporter: ACME EXPORTS",
        f"{BL_TEXT}\n*** THIS IS NOT AN SI OR BL ***",
        f"{BL_TEXT}\n*** PACKING LIST ONLY - NO PORT OR VESSEL DETAILS ***",
    ),
)
async def test_processor_marks_strong_wrong_document_indicators_for_review(
    wrong_document: str,
) -> None:
    inbox = make_txt_inbox(wrong_document)

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason.value == "wrong_doc_type"
    assert case.si_fields is None
    assert case.bl_fields is None
    assert case.comparison == []


async def test_processor_extracts_all_seven_fields_from_xlsx_si() -> None:
    inbox = make_xlsx_inbox()
    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert case.si_fields is not None
    assert all(value is not None for _, value in case.si_fields)
    assert case.si_fields.container_count.normalized_value == "3"
    assert case.si_fields.gross_weight_kg.normalized_value == "21577"


async def test_processor_extracts_all_seven_fields_from_xlsx_bl() -> None:
    inbox = make_xlsx_inbox()
    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert case.bl_fields is not None
    assert all(value is not None for _, value in case.bl_fields)
    assert case.bl_fields.container_count.normalized_value == "3"
    assert case.bl_fields.gross_weight_kg.normalized_value == "21577"


def test_document_to_text_reads_docx_table_and_strips_bilingual_suffixes() -> None:
    content = make_docx(
        (
            ("APRIL FAR EAST (M) SDN BHD", "80 RAFFLES PLACE"),
            *DOCX_VALUES[1:],
        )
    )

    text = document_to_text("attachments/email_xlsx_BL.docx", content)

    assert (
        "Shipper (Principal or Seller): "
        "APRIL FAR EAST (M) SDN BHD | 80 RAFFLES PLACE"
    ) in text
    assert "Notify Party/Intermediate Consignee: UAB NOVAKOPA" in text
    assert "Gross Weight毛重(KGS): 21,577 KG" in text
    assert "(发货人)" not in text
    assert "(通知人)" not in text


def test_docx_multiline_table_value_keeps_locator_null_when_not_exactly_mappable() -> None:
    filename = "attachments/email_docx_BL.docx"
    content = make_docx(
        (
            ("APRIL FAR EAST (M) SDN BHD", "80 RAFFLES PLACE"),
            *DOCX_VALUES[1:],
        )
    )
    document = read_document(filename, content)

    fields = extract_shipping_fields(
        document.text,
        source_filename=filename,
        source_lines=document.source_lines,
    )

    assert fields.shipper is not None
    assert fields.shipper.source is not None
    assert getattr(fields.shipper.source, "locator", None) is None


def test_docx_table_rows_take_precedence_over_top_level_paragraphs() -> None:
    document = Document(BytesIO(BL_DOCX))
    document.add_paragraph("Shipper: WRONG PARAGRAPH SHIPPER")
    content = BytesIO()
    document.save(content)
    document_content = read_document(
        "attachments/email_docx_BL.docx",
        content.getvalue(),
    )

    assert "WRONG PARAGRAPH SHIPPER" not in document_content.text
    assert document_content.text == document_to_text(
        "attachments/email_xlsx_BL.docx",
        BL_DOCX,
    )


def test_docx_text_reuses_existing_extractor_for_all_seven_fields() -> None:
    fields = extract_shipping_fields(
        document_to_text("attachments/email_xlsx_BL.docx", BL_DOCX)
    )

    assert all(value is not None for _, value in fields)
    assert fields.container_count.normalized_value == "3"
    assert fields.gross_weight_kg.normalized_value == "21577"


async def test_processor_compares_xlsx_si_with_docx_bl() -> None:
    inbox = make_xlsx_docx_inbox()
    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert case.si_fields is not None
    assert case.bl_fields is not None
    assert len(case.comparison) == 7


def test_document_to_text_reads_positioned_pdf_as_canonical_rows() -> None:
    text = document_to_text("attachments/email_pdf_SI.pdf", PDF_CONTENT)

    assert "Shipper: APRIL FAR EAST (M) SDN BHD" in text
    assert "Port of Discharge: CALLAO, PERU" in text


def test_pdf_text_reuses_existing_extractor_for_all_seven_fields() -> None:
    fields = extract_shipping_fields(
        document_to_text("attachments/email_pdf_BL.pdf", PDF_CONTENT)
    )

    assert all(value is not None for _, value in fields)
    assert fields.container_count.normalized_value == "3"
    assert fields.gross_weight_kg.normalized_value == "21577"


def test_document_to_text_joins_multiple_pdf_pages() -> None:
    content = make_pdf((PDF_ROWS[:4], PDF_ROWS[4:]))

    fields = extract_shipping_fields(
        document_to_text("attachments/email_pdf_BL.pdf", content)
    )

    assert all(value is not None for _, value in fields)


async def test_processor_keeps_txt_extraction_behavior_unchanged() -> None:
    inbox = FakeInbox()
    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert case.si_fields is not None
    assert case.bl_fields is not None
    assert len(case.comparison) == 7


def assert_source_metadata(
    fields: ShippingFields,
    filename: str,
    page: int | None,
) -> None:
    for _, field in fields:
        if field is None:
            continue
        assert field.source is not None
        assert field.source.filename == filename
        assert field.source.page == page
        assert field.source.evidence_text == field.evidence


async def test_processor_populates_txt_source_metadata_without_changing_legacy_fields() -> None:
    inbox = FakeInbox()

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.si_fields is not None
    assert_source_metadata(
        case.si_fields,
        "attachments/email_001_SI.txt",
        page=None,
    )
    assert case.si_fields.shipper is not None
    assert case.si_fields.shipper.page == 1
    assert case.si_fields.shipper.evidence == (
        "Shipper/Exporter: APRIL FAR EAST (M) SDN BHD"
    )


async def test_processor_populates_txt_line_and_character_locator() -> None:
    inbox = FakeInbox()

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.si_fields is not None
    assert case.si_fields.gross_weight_kg is not None
    assert case.si_fields.gross_weight_kg.source is not None
    locator = getattr(case.si_fields.gross_weight_kg.source, "locator", None)
    assert locator is not None
    assert locator.model_dump() == {
        "kind": "txt",
        "line_number": 8,
        "start_char": 19,
        "end_char": 28,
    }
    comparison = next(
        item for item in case.comparison if item.field == "gross_weight_kg"
    )
    assert comparison.si is not None
    assert comparison.si.source is not None
    assert comparison.si.source.locator == locator


@pytest.mark.parametrize(
    "si_text",
    (
        SI_TEXT.replace(
            "Shipper/Exporter: APRIL FAR EAST (M) SDN BHD",
            "Shipper: Shipper",
        ),
        SI_TEXT.replace(
            "Shipper/Exporter: APRIL FAR EAST (M) SDN BHD",
            "Shipper: ACME SHIPPING LTD\nShipper: ACME SHIPPING LTD",
        ),
    ),
)
async def test_processor_leaves_ambiguous_txt_locator_null(si_text: str) -> None:
    inbox = make_txt_inbox(BL_TEXT, si_text=si_text)

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.shipper.source is not None
    assert getattr(case.si_fields.shipper.source, "locator", None) is None


async def test_processor_populates_xlsx_and_docx_source_metadata() -> None:
    inbox = make_xlsx_docx_inbox()

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.si_fields is not None
    assert case.bl_fields is not None
    assert_source_metadata(
        case.si_fields,
        "attachments/email_xlsx_SI.xlsx",
        page=None,
    )
    assert_source_metadata(
        case.bl_fields,
        "attachments/email_xlsx_BL.docx",
        page=None,
    )
    assert case.bl_fields.shipper is not None
    assert case.bl_fields.shipper.source is not None
    shipper_locator = getattr(case.bl_fields.shipper.source, "locator", None)
    assert shipper_locator is not None
    assert shipper_locator.model_dump() == {
        "kind": "docx",
        "paragraph_index": None,
        "table_index": 0,
        "row_index": 0,
        "cell_index": 1,
        "start_char": 0,
        "end_char": 26,
    }


async def test_processor_extracts_paragraph_only_docx_with_zero_based_locator() -> None:
    content = make_paragraph_docx()
    inbox = AttachmentInbox(
        {
            "attachments/email_docx_SI.docx": content,
            "attachments/email_docx_BL.docx": content,
        }
    )

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.status is CaseStatus.MATCH
    assert case.si_fields is not None
    assert all(value is not None for _, value in case.si_fields)
    assert case.si_fields.shipper is not None
    assert case.si_fields.gross_weight_kg is not None
    assert case.si_fields.shipper.source is not None
    assert case.si_fields.gross_weight_kg.source is not None
    shipper_locator = getattr(case.si_fields.shipper.source, "locator", None)
    weight_locator = getattr(case.si_fields.gross_weight_kg.source, "locator", None)
    assert shipper_locator is not None
    assert weight_locator is not None
    assert shipper_locator.model_dump() == {
        "kind": "docx",
        "paragraph_index": 1,
        "table_index": None,
        "row_index": None,
        "cell_index": None,
        "start_char": 9,
        "end_char": 26,
    }
    assert weight_locator.model_dump() == {
        "kind": "docx",
        "paragraph_index": 7,
        "table_index": None,
        "row_index": None,
        "cell_index": None,
        "start_char": 19,
        "end_char": 28,
    }


@pytest.mark.parametrize(
    "content",
    (
        pytest.param(make_paragraph_docx(shipper="Shipper"), id="raw-value-repeated-in-line"),
        pytest.param(make_paragraph_docx(duplicate_shipper=True), id="duplicate-evidence"),
    ),
)
async def test_processor_leaves_ambiguous_docx_locator_null(content: bytes) -> None:
    inbox = AttachmentInbox(
        {
            "attachments/email_docx_SI.docx": content,
            "attachments/email_docx_BL.docx": content,
        }
    )

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.shipper.source is not None
    assert getattr(case.si_fields.shipper.source, "locator", None) is None


async def test_processor_populates_xlsx_sheet_and_value_cell_locator() -> None:
    labels = (
        "Shipper/Exporter",
        "Consignee (Non-Negotiable)",
        "Notify Party",
        "Port of Loading",
        "Port of Discharge",
        "No. of Containers",
        "Gross Weight (KG)",
    )
    content = make_xlsx(labels, sheet_name="Shipping Data")
    inbox = AttachmentInbox(
        {
            "attachments/email_xlsx_SI.xlsx": content,
            "attachments/email_xlsx_BL.xlsx": content,
        }
    )

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.gross_weight_kg is not None
    assert case.si_fields.shipper.source is not None
    assert case.si_fields.gross_weight_kg.source is not None
    shipper_locator = getattr(case.si_fields.shipper.source, "locator", None)
    weight_locator = getattr(case.si_fields.gross_weight_kg.source, "locator", None)
    assert shipper_locator is not None
    assert weight_locator is not None
    assert shipper_locator.model_dump() == {
        "kind": "xlsx",
        "sheet_name": "Shipping Data",
        "cell_address": "B4",
    }
    assert weight_locator.model_dump() == {
        "kind": "xlsx",
        "sheet_name": "Shipping Data",
        "cell_address": "B10",
    }


def test_xlsx_locator_is_null_without_a_reliable_source_mapping() -> None:
    filename = "attachments/email_xlsx_SI.xlsx"
    document = read_document(filename, SI_XLSX)

    fields = extract_shipping_fields(
        document.text,
        source_filename=filename,
    )

    assert fields.shipper is not None
    assert fields.shipper.source is not None
    assert getattr(fields.shipper.source, "locator", None) is None


async def test_processor_maps_pdf_evidence_to_one_based_page_numbers() -> None:
    content = make_pdf((PDF_ROWS[:4], PDF_ROWS[4:]))
    inbox = AttachmentInbox(
        {
            "attachments/email_pdf_SI.pdf": content,
            "attachments/email_pdf_BL.pdf": content,
        }
    )

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.gross_weight_kg is not None
    assert case.si_fields.shipper.source is not None
    assert case.si_fields.gross_weight_kg.source is not None
    assert case.si_fields.shipper.source.page == 1
    assert case.si_fields.gross_weight_kg.source.page == 2
    assert case.si_fields.shipper.source.locator is None
    assert case.si_fields.gross_weight_kg.source.locator is None
    assert case.si_fields.shipper.source.filename == "attachments/email_pdf_SI.pdf"
    assert case.si_fields.gross_weight_kg.source.evidence_text == (
        "Gross Weight (KG): 21,577 KG"
    )


async def test_processor_does_not_guess_pdf_page_when_evidence_is_duplicated() -> None:
    content = make_pdf((PDF_ROWS, (PDF_ROWS[0],)))
    inbox = AttachmentInbox(
        {
            "attachments/email_pdf_SI.pdf": content,
            "attachments/email_pdf_BL.pdf": content,
        }
    )

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.si_fields is not None
    assert case.si_fields.shipper is not None
    assert case.si_fields.shipper.source is not None
    assert case.si_fields.shipper.source.page is None


async def test_processor_marks_scanned_or_unreadable_pdf_for_review() -> None:
    blank_pdf = make_pdf(((),))
    inbox = AttachmentInbox(
        {
            "attachments/email_xlsx_SI.xlsx": SI_XLSX,
            "attachments/email_xlsx_BL.pdf": blank_pdf,
        }
    )

    case = await CaseProcessor(inbox).process_email(inbox.email)

    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason.value == "unreadable"
