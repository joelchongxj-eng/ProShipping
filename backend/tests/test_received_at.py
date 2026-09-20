from fastapi.testclient import TestClient

import app.main as main
from app.models import CaseRecord, CaseStatus, EmailCategory, EmailRecord


def make_case(received_at: object = None) -> CaseRecord:
    email_data: dict[str, object] = {
        "email_id": "email_received_at",
        "from": "shipping@example.com",
        "subject": "Please compare SI and BL",
        "body": "See attachments.",
        "attachments": ["attachments/si.txt", "attachments/bl.txt"],
    }
    if received_at is not None:
        email_data["received_at"] = received_at
    return CaseRecord(
        email=EmailRecord.model_validate(email_data),
        category=EmailCategory.BL_COMPARISON,
        status=CaseStatus.MATCH,
        si_attachment="attachments/si.txt",
        bl_attachment="attachments/bl.txt",
    )


def test_case_list_and_detail_return_valid_source_timestamp() -> None:
    case = make_case("2026-09-18T10:25:00+08:00")
    main.cases[case.email.email_id] = case
    client = TestClient(main.app)

    list_payload = client.get("/api/cases").json()
    detail_payload = client.get(f"/api/cases/{case.email.email_id}").json()

    assert list_payload[0]["email"]["received_at"] == "2026-09-18T10:25:00+08:00"
    assert detail_payload["email"]["received_at"] == "2026-09-18T10:25:00+08:00"
    main.cases.clear()


def test_email_without_timestamp_returns_null() -> None:
    case = make_case()
    main.cases[case.email.email_id] = case

    payload = TestClient(main.app).get("/api/cases").json()

    assert payload[0]["email"]["received_at"] is None
    main.cases.clear()


def test_invalid_optional_timestamp_does_not_crash_processing() -> None:
    case = make_case("not-a-date")

    assert case.email.received_at is None


def test_existing_email_and_case_fields_remain_unchanged() -> None:
    case = make_case()
    main.cases[case.email.email_id] = case

    payload = TestClient(main.app).get(f"/api/cases/{case.email.email_id}").json()

    assert payload["email"] == {
        "email_id": "email_received_at",
        "from": "shipping@example.com",
        "subject": "Please compare SI and BL",
        "body": "See attachments.",
        "attachments": ["attachments/si.txt", "attachments/bl.txt"],
        "received_at": None,
    }
    assert payload["category"] == "BL_COMPARISON"
    assert payload["status"] == "MATCH"
    assert payload["si_attachment"] == "attachments/si.txt"
    assert payload["bl_attachment"] == "attachments/bl.txt"
    assert payload["comparison"] == []
    main.cases.clear()
