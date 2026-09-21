import csv
import io

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.models import (
    CaseRecord,
    CaseStatus,
    EmailCategory,
    EmailRecord,
    ExtractedField,
    FieldComparison,
    FieldStatus,
    ReviewReason,
    ShippingFields,
)


FIELDS = (
    "shipper",
    "consignee",
    "notify_party",
    "port_of_loading",
    "port_of_discharge",
    "container_count",
    "gross_weight_kg",
)
BASE_COLUMNS = (
    "email_id",
    "category",
    "processing_status",
    "review_reason",
    "si_attachment",
    "bl_attachment",
)
SI_COLUMNS = tuple(
    f"si_{field}_{detail}"
    for field in FIELDS
    for detail in ("raw", "normalized", "evidence")
)
BL_COLUMNS = tuple(
    f"bl_{field}_{detail}"
    for field in FIELDS
    for detail in ("raw", "normalized", "evidence")
)
COMPARISON_COLUMNS = tuple(
    column
    for field in FIELDS
    for column in (f"{field}_status", f"{field}_reason")
)
EXPECTED_COLUMNS = BASE_COLUMNS + SI_COLUMNS + BL_COLUMNS + COMPARISON_COLUMNS + ("defect_fields",)


@pytest.fixture(autouse=True)
def clear_processed_cases() -> None:
    main.cases.clear()
    yield
    main.cases.clear()


def extracted(field: str, value: str, evidence: str | None = None) -> ExtractedField:
    return ExtractedField(
        field=field,
        raw_value=value,
        normalized_value=value.casefold(),
        confidence=0.99,
        evidence=evidence if evidence is not None else f"{field}: {value}",
    )


def make_case(
    email_id: str,
    *,
    category: EmailCategory = EmailCategory.BL_COMPARISON,
    status: CaseStatus = CaseStatus.MATCH,
    review_reason: ReviewReason | None = None,
    si_fields: ShippingFields | None = None,
    bl_fields: ShippingFields | None = None,
    comparison: list[FieldComparison] | None = None,
    si_attachment: str | None = "si.pdf",
    bl_attachment: str | None = "bl.pdf",
) -> CaseRecord:
    return CaseRecord(
        email=EmailRecord(
            email_id=email_id,
            **{"from": "shipping@example.com"},
            subject="Shipping documents",
            body="Please review.",
            attachments=[name for name in (si_attachment, bl_attachment) if name],
        ),
        category=category,
        status=status,
        review_reason=review_reason,
        si_attachment=si_attachment,
        bl_attachment=bl_attachment,
        si_fields=si_fields,
        bl_fields=bl_fields,
        comparison=comparison or [],
    )


def export_response():
    return TestClient(main.app).get("/api/export/detailed-csv")


def export_rows() -> list[dict[str, str]]:
    response = export_response()
    assert response.status_code == 200
    return list(csv.DictReader(io.StringIO(response.text, newline="")))


def test_csv_contains_exactly_one_row_per_case() -> None:
    main.cases["email_1"] = make_case("email_1")
    main.cases["email_2"] = make_case("email_2")

    rows = export_rows()

    assert [row["email_id"] for row in rows] == ["email_1", "email_2"]


def test_csv_base_columns_are_first_and_present() -> None:
    main.cases["email_1"] = make_case("email_1")
    response = export_response()
    header = next(csv.reader(io.StringIO(response.text, newline="")))

    assert tuple(header[:6]) == BASE_COLUMNS
    assert len(header) == 63


def test_csv_contains_all_si_field_column_groups_in_fixed_order() -> None:
    main.cases["email_1"] = make_case("email_1")
    header = next(csv.reader(io.StringIO(export_response().text, newline="")))

    assert tuple(header[6:27]) == SI_COLUMNS
    assert tuple(header) == EXPECTED_COLUMNS


def test_csv_contains_all_bl_field_column_groups_in_fixed_order() -> None:
    main.cases["email_1"] = make_case("email_1")
    header = next(csv.reader(io.StringIO(export_response().text, newline="")))

    assert tuple(header[27:48]) == BL_COLUMNS
    assert tuple(header) == EXPECTED_COLUMNS


def test_csv_contains_all_comparison_status_and_reason_columns_in_fixed_order() -> None:
    main.cases["email_1"] = make_case("email_1")
    header = next(csv.reader(io.StringIO(export_response().text, newline="")))

    assert tuple(header[48:62]) == COMPARISON_COLUMNS
    assert header[62] == "defect_fields"


def test_defect_fields_contains_only_existing_mismatch_comparisons() -> None:
    comparisons = [
        FieldComparison(
            field="shipper",
            status=FieldStatus.MATCH,
            si=extracted("shipper", "ACME"),
            bl=extracted("shipper", "ACME"),
            reason="Values match.",
        ),
        FieldComparison(
            field="consignee",
            status=FieldStatus.MISMATCH,
            si=extracted("consignee", "Alpha"),
            bl=extracted("consignee", "Beta"),
            reason="Values differ.",
        ),
        FieldComparison(
            field="notify_party",
            status=FieldStatus.MISSING,
            si=None,
            bl=None,
            reason="Values are missing.",
        ),
        FieldComparison(
            field="gross_weight_kg",
            status=FieldStatus.MISMATCH,
            si=extracted("gross_weight_kg", "100"),
            bl=extracted("gross_weight_kg", "200"),
            reason="Weights differ.",
        ),
    ]
    main.cases["email_1"] = make_case("email_1", comparison=comparisons)

    row = export_rows()[0]

    assert row["defect_fields"] == "consignee;gross_weight_kg"


def test_missing_extraction_leaves_all_si_and_bl_cells_blank() -> None:
    main.cases["email_1"] = make_case("email_1", si_fields=None, bl_fields=None)

    row = export_rows()[0]

    assert all(row[column] == "" for column in SI_COLUMNS + BL_COLUMNS)


def test_missing_comparison_leaves_status_and_reason_blank_not_match() -> None:
    main.cases["email_1"] = make_case("email_1", comparison=[])

    row = export_rows()[0]

    assert all(row[column] == "" for column in COMPARISON_COLUMNS)
    assert row["defect_fields"] == ""


@pytest.mark.parametrize(
    ("evidence", "encoded_fragment"),
    (
        ("Shown as ACME, Incorporated", '"Shown as ACME, Incorporated"'),
        ('Consignee is "ACME"', '"Consignee is ""ACME"""'),
        ("Line one\r\nLine two\nLine three", '"Line one\r\nLine two\nLine three"'),
    ),
    ids=("comma", "quotes", "line-breaks"),
)
def test_evidence_is_csv_escaped_and_round_trips(evidence: str, encoded_fragment: str) -> None:
    main.cases["email_1"] = make_case(
        "email_1",
        si_fields=ShippingFields(shipper=extracted("shipper", "ACME", evidence)),
    )

    response = export_response()
    rows = list(csv.DictReader(io.StringIO(response.text, newline="")))

    assert encoded_fragment in response.text
    assert len(rows) == 1
    assert rows[0]["si_shipper_evidence"] == evidence


def test_non_bl_comparison_case_is_retained() -> None:
    main.cases["email_general"] = make_case(
        "email_general",
        category=EmailCategory.GENERAL,
        status=CaseStatus.NEEDS_REVIEW,
        review_reason=ReviewReason.WRONG_DOC_TYPE,
        si_attachment=None,
        bl_attachment=None,
    )

    row = export_rows()[0]

    assert row["email_id"] == "email_general"
    assert row["category"] == "GENERAL"
    assert row["processing_status"] == "NEEDS_REVIEW"
    assert row["review_reason"] == "wrong_doc_type"


def test_missing_attachment_unreadable_case_is_retained() -> None:
    main.cases["email_unreadable"] = make_case(
        "email_unreadable",
        status=CaseStatus.NEEDS_REVIEW,
        review_reason=ReviewReason.UNREADABLE,
        si_attachment="si.pdf",
        bl_attachment=None,
    )

    row = export_rows()[0]

    assert row["email_id"] == "email_unreadable"
    assert row["processing_status"] == "NEEDS_REVIEW"
    assert row["review_reason"] == "unreadable"
    assert row["bl_attachment"] == ""


def test_export_endpoint_does_not_call_processing_or_ai(monkeypatch: pytest.MonkeyPatch) -> None:
    class ExplodingDependency:
        def __getattr__(self, name: str):
            raise AssertionError(f"Export unexpectedly accessed {name}")

    main.cases["email_1"] = make_case("email_1")
    monkeypatch.setattr(main, "processor", ExplodingDependency())
    monkeypatch.setattr(main, "ai_service", ExplodingDependency())
    monkeypatch.setattr(main, "semantic_ai_service", ExplodingDependency())

    response = export_response()

    assert response.status_code == 200
    assert len(list(csv.DictReader(io.StringIO(response.text, newline="")))) == 1


def test_export_preserves_competition_submission_response() -> None:
    main.cases["email_1"] = make_case("email_1")
    client = TestClient(main.app)
    before = client.get("/api/submission")

    exported = client.get("/api/export/detailed-csv")
    after = client.get("/api/submission")

    assert exported.status_code == 200
    assert before.status_code == 200
    assert after.status_code == 200
    assert after.json() == before.json()
    assert exported.headers["content-type"].startswith("text/csv")
    assert exported.headers["content-disposition"] == 'attachment; filename="proshipping_detailed_results.csv"'
