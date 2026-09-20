import pytest

from app.models import (
    DocxSourceLocator,
    ExtractedField,
    PdfBoundingBox,
    PdfSourceLocator,
    SourceLocation,
    TxtSourceLocator,
    XlsxSourceLocator,
)
from app.services.text_extractor import extract_shipping_fields


SI_TEXT = """SHIPPING INSTRUCTION
Shipper/Exporter: APRIL FAR EAST (M) SDN BHD
CONSIGNEE: MOORIM SP CO., LTD
NOTIFY PARTY: UAB NOVAKOPA
Port of Loading: PORT KLANG (WESTPORT), MALAYSIA (MYPKG)
Discharge Port: CALLAO, PERU (PECLL)
No. of Containers or Packages: 1 x 40'HC
Gross Weight (KG): 21,577 KG
"""

BL_TEXT = """BILL OF LADING (DRAFT)
SHIPPER: APRIL FAR EAST (M) SDN BHD
CONSIGNEE: MOORIM SP CO., LTD
Notify: UAB NOVAKOPA
Port of Loading (POL): PORT KLANG (WESTPORT), MALAYSIA (MYPKG)
POD: CALLAO, PERU (PECLL)
Container Count: 1 x 40'HC
Gross Wt (kgs): 21,577 KG
"""


def test_source_location_schema_is_optional_for_backward_compatibility() -> None:
    field = ExtractedField(
        field="shipper",
        raw_value="ACME SHIPPING LTD",
        normalized_value="acme shipping ltd",
        confidence=0.99,
        page=1,
        evidence="Shipper: ACME SHIPPING LTD",
    )

    assert field.source is None
    source = SourceLocation(
        filename="attachments/email_001_SI.txt",
        page=None,
        evidence_text="Shipper: ACME SHIPPING LTD",
    )
    assert source.model_dump() == {
        "filename": "attachments/email_001_SI.txt",
        "page": None,
        "evidence_text": "Shipper: ACME SHIPPING LTD",
        "locator": None,
    }


def test_source_location_accepts_txt_and_xlsx_locators() -> None:
    txt_source = SourceLocation(
        filename="attachments/email_001_SI.txt",
        page=None,
        evidence_text="Gross Weight (KG): 21,577 KG",
        locator=TxtSourceLocator(
            kind="txt",
            line_number=8,
            start_char=19,
            end_char=28,
        ),
    )
    xlsx_source = SourceLocation(
        filename="attachments/email_055_SI.xlsx",
        page=None,
        evidence_text="Gross Weight (KG): 21577",
        locator=XlsxSourceLocator(
            kind="xlsx",
            sheet_name="Shipping Data",
            cell_address="B10",
        ),
    )

    assert txt_source.model_dump()["locator"] == {
        "kind": "txt",
        "line_number": 8,
        "start_char": 19,
        "end_char": 28,
    }
    assert xlsx_source.model_dump()["locator"] == {
        "kind": "xlsx",
        "sheet_name": "Shipping Data",
        "cell_address": "B10",
    }


def test_source_location_accepts_optional_docx_locator() -> None:
    source = SourceLocation(
        filename="attachments/email_001_BL.docx",
        page=None,
        evidence_text="Shipper: ACME SHIPPING LTD",
        locator=DocxSourceLocator(
            kind="docx",
            paragraph_index=None,
            table_index=0,
            row_index=0,
            cell_index=1,
            start_char=0,
            end_char=17,
        ),
    )

    assert source.model_dump()["locator"] == {
        "kind": "docx",
        "paragraph_index": None,
        "table_index": 0,
        "row_index": 0,
        "cell_index": 1,
        "start_char": 0,
        "end_char": 17,
    }


def test_source_location_accepts_optional_pdf_locator() -> None:
    source = SourceLocation(
        filename="attachments/email_001_BL.pdf",
        page=2,
        evidence_text="Gross Weight (KG): 21,577 KG",
        locator=PdfSourceLocator(
            kind="pdf",
            page=2,
            bbox=PdfBoundingBox(x0=220.0, y0=60.0, x1=269.0, y1=75.0),
        ),
    )

    assert source.model_dump()["locator"] == {
        "kind": "pdf",
        "page": 2,
        "bbox": {"x0": 220.0, "y0": 60.0, "x1": 269.0, "y1": 75.0},
    }


def test_extracts_seven_fields_from_si_and_bl_text() -> None:
    si = extract_shipping_fields(SI_TEXT)
    bl = extract_shipping_fields(BL_TEXT)

    for fields in (si, bl):
        assert fields.shipper.raw_value == "APRIL FAR EAST (M) SDN BHD"
        assert fields.consignee.raw_value == "MOORIM SP CO., LTD"
        assert fields.notify_party.raw_value == "UAB NOVAKOPA"
        assert fields.port_of_loading.raw_value.startswith("PORT KLANG")
        assert fields.port_of_discharge.raw_value.startswith("CALLAO")
        assert fields.container_count.normalized_value == "1"
        assert fields.gross_weight_kg.normalized_value == "21577"


@pytest.mark.parametrize(
    ("label", "value", "expected"),
    (
        ("No. of Containers", "3", "3"),
        ("No. of Containers", "3 x 40'HC", "3"),
        ("Total Containers", "6 x 20'GP", "6"),
        ("No. of Containers or Packages", "2 x 40'HC", "2"),
        ("Container Count", "4 x 20'GP", "4"),
        ("Containers", "5 x 40'HC", "5"),
    ),
)
def test_extracts_container_count_from_supported_labels(
    label: str, value: str, expected: str
) -> None:
    fields = extract_shipping_fields(f"{label}: {value}")

    assert fields.container_count is not None
    assert fields.container_count.raw_value == value
    assert fields.container_count.normalized_value == expected


@pytest.mark.parametrize(
    "label",
    (
        "Port of Discharge",
        "Port of Discharge (POD)",
        "Discharge Port",
        "POD",
    ),
)
def test_extracts_port_of_discharge_from_supported_labels(label: str) -> None:
    fields = extract_shipping_fields(f"{label}: CALLAO, PERU")

    assert fields.port_of_discharge is not None
    assert fields.port_of_discharge.raw_value == "CALLAO, PERU"
    assert fields.port_of_discharge.normalized_value == "callao peru"


@pytest.mark.parametrize(
    "label",
    (
        "Gross Weight毛重(KGS)",
        "Gross Weight",
        "Gross Weight (KG)",
        "Gross Wt (KGS)",
        "G.W.",
    ),
)
def test_extracts_gross_weight_from_supported_labels(label: str) -> None:
    fields = extract_shipping_fields(f"{label}: 21,577 KG")

    assert fields.gross_weight_kg is not None
    assert fields.gross_weight_kg.raw_value == "21,577 KG"
    assert fields.gross_weight_kg.normalized_value == "21577"
    assert fields.gross_weight_kg.unit == "kg"


@pytest.mark.parametrize(
    "label",
    (
        "TOTAL Gross Weight (KG)",
        "TOTAL Gross Wt (kgs)",
        "TOTAL GROSS WEIGHT",
        "TOTAL Gross WeightII(KGS)",
    ),
)
def test_extracts_gross_weight_from_observed_total_prefixed_labels(label: str) -> None:
    fields = extract_shipping_fields(f"{label}: 131,322 KG")

    assert fields.gross_weight_kg is not None
    assert fields.gross_weight_kg.raw_value == "131,322 KG"
    assert fields.gross_weight_kg.normalized_value == "131322"
    assert fields.gross_weight_kg.unit == "kg"


@pytest.mark.parametrize(
    "label",
    (
        "Shipper",
        "Shipper/Exporter",
        "Shipper (Principal or Seller)",
        "Exporter",
    ),
)
def test_extracts_shipper_from_supported_labels(label: str) -> None:
    fields = extract_shipping_fields(f"{label}: ACME SHIPPING LTD")

    assert fields.shipper is not None
    assert fields.shipper.raw_value == "ACME SHIPPING LTD"
    assert fields.shipper.normalized_value == "acme shipping ltd"


@pytest.mark.parametrize(
    "label",
    (
        "Consignee",
        "Consignee (Non-Negotiable)",
        "To the Order of",
    ),
)
def test_extracts_consignee_from_supported_labels(label: str) -> None:
    fields = extract_shipping_fields(f"{label}: ACME IMPORTS LTD")

    assert fields.consignee is not None
    assert fields.consignee.raw_value == "ACME IMPORTS LTD"
    assert fields.consignee.normalized_value == "acme imports ltd"


@pytest.mark.parametrize(
    "label",
    (
        "Notify Party",
        "Notify",
        "Notify Party/Intermediate Consignee",
    ),
)
def test_extracts_notify_party_from_supported_labels(label: str) -> None:
    fields = extract_shipping_fields(f"{label}: ACME NOTIFY LTD")

    assert fields.notify_party is not None
    assert fields.notify_party.raw_value == "ACME NOTIFY LTD"
    assert fields.notify_party.normalized_value == "acme notify ltd"


def test_extracts_container_and_weight_from_one_line() -> None:
    fields = extract_shipping_fields(
        "Container Count: 2 Gross Weight: 25000 KG"
    )

    assert fields.container_count is not None
    assert fields.gross_weight_kg is not None
    assert fields.container_count.raw_value == "2"
    assert fields.container_count.evidence == "Container Count: 2"
    assert fields.gross_weight_kg.raw_value == "25000 KG"
    assert fields.gross_weight_kg.evidence == "Gross Weight: 25000 KG"


@pytest.mark.parametrize(
    ("text", "expected"),
    (
        (
            "Shipper: ABC LTD Consignee: XYZ LTD",
            {"shipper": "ABC LTD", "consignee": "XYZ LTD"},
        ),
        (
            "Shipper: ABC LTD Consignee: XYZ LTD Notify Party: XYZ LTD",
            {
                "shipper": "ABC LTD",
                "consignee": "XYZ LTD",
                "notify_party": "XYZ LTD",
            },
        ),
        (
            "Port of Loading: PORT KLANG Port of Discharge: SINGAPORE",
            {
                "port_of_loading": "PORT KLANG",
                "port_of_discharge": "SINGAPORE",
            },
        ),
    ),
)
def test_extracts_multiple_known_labels_from_one_line(
    text: str,
    expected: dict[str, str],
) -> None:
    fields = extract_shipping_fields(text)

    for field, value in expected.items():
        extracted = getattr(fields, field)
        assert extracted is not None
        assert extracted.raw_value == value


def test_existing_single_field_line_keeps_its_value_and_evidence() -> None:
    fields = extract_shipping_fields("Shipper: ABC LTD")

    assert fields.shipper is not None
    assert fields.shipper.raw_value == "ABC LTD"
    assert fields.shipper.evidence == "Shipper: ABC LTD"


@pytest.mark.parametrize(
    "text",
    (
        "Shipper: Gross Weight Logistics Sdn Bhd",
        "Shipper: ABC LTD Gross Weight Logistics Sdn Bhd",
    ),
)
def test_field_words_without_label_colon_do_not_create_false_split(text: str) -> None:
    fields = extract_shipping_fields(text)

    assert fields.shipper is not None
    assert fields.shipper.raw_value.endswith("Gross Weight Logistics Sdn Bhd")
    assert fields.gross_weight_kg is None
