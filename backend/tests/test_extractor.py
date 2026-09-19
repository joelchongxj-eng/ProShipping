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


def test_extracts_office_document_label_variants() -> None:
    text = """BILL OF LADING (DRAFT)
Shipper (Principal or Seller): APRIL FINE PAPER TRADING | 77 ROBINSON ROAD
Consignee (Non-Negotiable): AL GURG STATIONERY LLC | P.O. BOX 5069
Notify: AL GURG STATIONERY LLC | P.O. BOX 5069
PORT OF LOADING: SINGAPORE
POD: KARACHI, PAKISTAN
Total Containers: 12 x 20'FCL
Gross Wt (kgs): 243,588
"""
    fields = extract_shipping_fields(text)
    assert all(value is not None for _, value in fields)
    assert fields.container_count.normalized_value == "12"

