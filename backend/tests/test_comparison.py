from app.models import CaseStatus
from app.services.comparison import compare_documents
from app.services.text_extractor import extract_shipping_fields

from tests.test_extractor import BL_TEXT, SI_TEXT


def test_matching_documents_are_marked_match() -> None:
    result = compare_documents(
        extract_shipping_fields(SI_TEXT),
        extract_shipping_fields(BL_TEXT),
    )

    assert result.status is CaseStatus.MATCH
    assert len(result.fields) == 7
    assert all(item.status.value == "match" for item in result.fields)


def test_changed_consignee_is_a_mismatch() -> None:
    changed_bl = BL_TEXT.replace("MOORIM SP CO., LTD", "DIFFERENT COMPANY LTD")
    result = compare_documents(
        extract_shipping_fields(SI_TEXT),
        extract_shipping_fields(changed_bl),
    )

    assert result.status is CaseStatus.MISMATCH
    assert [item.field for item in result.fields if item.status.value == "mismatch"] == [
        "consignee"
    ]

