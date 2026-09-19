import pytest

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
