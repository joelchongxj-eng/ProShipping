from importlib import import_module

from app.models import CaseStatus, FieldStatus, ReviewReason


SI_TEXT = b"""Shipper: ACME EXPORT LTD
Consignee: ACME IMPORT LTD
Notify Party: ACME NOTIFY LTD
Port of Loading: PORT KLANG
Port of Discharge: CALLAO
Container Count: 3
Gross Weight (KG): 21,577 KG
"""

BL_WITH_MISMATCH_AND_MISSING = b"""Shipper: DIFFERENT EXPORT LTD
Consignee: ACME IMPORT LTD
Port of Loading: PORT KLANG
Port of Discharge: CALLAO
Container Count: 3
Gross Weight (KG): 21,577 KG
"""


def test_document_pair_preserves_mismatch_over_missing_precedence() -> None:
    compare_document_pair = import_module(
        "app.services.document_pair"
    ).compare_document_pair

    result = compare_document_pair(
        "uploads/example/si/si.txt",
        SI_TEXT,
        "uploads/example/bl/bl.txt",
        BL_WITH_MISMATCH_AND_MISSING,
    )

    assert result.status is CaseStatus.MISMATCH
    assert result.review_reason is ReviewReason.MISSING_VALUE
    assert [item.field for item in result.comparison] == [
        "shipper",
        "consignee",
        "notify_party",
        "port_of_loading",
        "port_of_discharge",
        "container_count",
        "gross_weight_kg",
    ]
    assert result.comparison[0].status is FieldStatus.MISMATCH
    assert result.comparison[2].status is FieldStatus.MISSING
