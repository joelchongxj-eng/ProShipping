import pytest
from fastapi.testclient import TestClient
from uuid import UUID

import app.main as main
from app.models import CaseRecord, EmailCategory, EmailRecord
from app.services.document_pair import compare_document_pair


SI_TEXT = b"""Shipper: ACME EXPORT LTD
Consignee: ACME IMPORT LTD
Notify Party: ACME NOTIFY LTD
Port of Loading: PORT KLANG
Port of Discharge: CALLAO
Container Count: 3
Gross Weight (KG): 21,577 KG
"""
BL_TEXT = SI_TEXT.replace(b"21,577 KG", b"20,000 KG")


class RecordingSender:
    recipient = "supervisor@example.com"

    def __init__(self) -> None:
        self.messages: list[tuple[str, str]] = []

    async def send(self, subject: str, body: str) -> None:
        self.messages.append((subject, body))


class FailingSender:
    recipient = "supervisor@example.com"

    async def send(self, subject: str, body: str) -> None:
        raise RuntimeError("secret SMTP server detail")


def seed_mismatch_case(email_id: str) -> CaseRecord:
    result = compare_document_pair(
        f"attachments/{email_id}_SI.txt",
        SI_TEXT,
        f"attachments/{email_id}_BL.txt",
        BL_TEXT,
    )
    case = CaseRecord(
        email=EmailRecord(
            email_id=email_id,
            **{"from": "shipping@example.com"},
            subject="Compare SI and BL",
            body="Please review the attached documents.",
            attachments=[
                f"attachments/{email_id}_SI.txt",
                f"attachments/{email_id}_BL.txt",
            ],
        ),
        category=EmailCategory.BL_COMPARISON,
        status=result.status,
        si_attachment=f"attachments/{email_id}_SI.txt",
        bl_attachment=f"attachments/{email_id}_BL.txt",
        si_fields=result.si_fields,
        bl_fields=result.bl_fields,
        comparison=result.comparison,
        review_reason=result.review_reason,
    )
    main.cases[email_id] = case
    return case


def escalation_payload() -> dict[str, str]:
    return {
        "scope": "FIELD",
        "field": "gross_weight_kg",
        "side": "BOTH",
        "action": "ESCALATE",
        "escalation_reason": "The SI and BL weights differ.",
        "reviewer_action": "Checked the source values in both documents.",
        "requested_decision": "Approve the SI value or request a corrected BL.",
    }


@pytest.fixture(autouse=True)
def clear_state(monkeypatch: pytest.MonkeyPatch) -> None:
    main.cases.clear()
    main.human_review_store.clear()
    store = getattr(main, "escalation_store", None)
    if store is not None:
        store.clear()
    monkeypatch.delenv("SUPERVISOR_EMAIL", raising=False)
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("SMTP_FROM_EMAIL", raising=False)
    escalation_service = getattr(main, "escalation_service", None)
    original_sender_factory = (
        escalation_service.sender_factory if escalation_service is not None else None
    )
    yield
    main.cases.clear()
    main.human_review_store.clear()
    if store is not None:
        store.clear()
    if escalation_service is not None:
        escalation_service.sender_factory = original_sender_factory


@pytest.mark.parametrize(
    ("missing_field", "expected_detail"),
    (
        ("reviewer_action", "ESCALATE requires reviewer_action."),
        ("requested_decision", "ESCALATE requires requested_decision."),
    ),
)
def test_escalate_requires_explicit_assignment_inputs(
    missing_field: str,
    expected_detail: str,
) -> None:
    seed_mismatch_case("email_escalation_validation")
    payload = escalation_payload()
    payload.pop(missing_field)

    response = TestClient(main.app).post(
        "/api/cases/email_escalation_validation/reviews",
        json=payload,
    )

    assert response.status_code == 422
    assert response.json() == {"detail": expected_detail}


@pytest.mark.parametrize(
    ("payload_update", "expected_detail"),
    (
        ({"scope": "CASE", "field": None, "side": None}, "ESCALATE requires field scope."),
        ({"side": "SI"}, "ESCALATE requires side BOTH."),
    ),
)
def test_escalate_requires_a_specific_field_and_both_values(
    payload_update: dict[str, str | None],
    expected_detail: str,
) -> None:
    seed_mismatch_case("email_escalation_scope")
    payload = {**escalation_payload(), **payload_update}

    response = TestClient(main.app).post(
        "/api/cases/email_escalation_scope/reviews",
        json=payload,
    )

    assert response.status_code == 422
    assert response.json() == {"detail": expected_detail}


def test_unconfigured_delivery_saves_only_relevant_field_assignment() -> None:
    seed_mismatch_case("email_escalation_not_configured")
    client = TestClient(main.app)

    created = client.post(
        "/api/cases/email_escalation_not_configured/reviews",
        json=escalation_payload(),
    )
    history = client.get(
        "/api/cases/email_escalation_not_configured/escalations"
    )

    assert created.status_code == 201
    assert history.status_code == 200
    assignments = history.json()["assignments"]
    assert len(assignments) == 1
    assignment = assignments[0]
    assert assignment["field"] == "gross_weight_kg"
    assert assignment["si_value"] == "21,577 KG"
    assert assignment["bl_value"] == "20,000 KG"
    assert assignment["reviewer_action"] == (
        "Checked the source values in both documents."
    )
    assert assignment["requested_decision"] == (
        "Approve the SI value or request a corrected BL."
    )
    assert "si_fields" not in assignment
    assert "bl_fields" not in assignment
    assert assignment["delivery_status"] == "NOT_CONFIGURED"
    assert [attempt["status"] for attempt in assignment["delivery_attempts"]] == [
        "NOT_CONFIGURED"
    ]


def test_configured_delivery_sends_field_only_supervisor_email() -> None:
    seed_mismatch_case("email_escalation_sent")
    sender = RecordingSender()
    main.escalation_service.sender_factory = lambda: sender
    client = TestClient(main.app)

    created = client.post(
        "/api/cases/email_escalation_sent/reviews",
        json=escalation_payload(),
    )
    assignment = client.get(
        "/api/cases/email_escalation_sent/escalations"
    ).json()["assignments"][0]

    assert created.status_code == 201
    assert assignment["delivery_status"] == "SENT"
    assert assignment["supervisor_email"] == "supervisor@example.com"
    assert len(sender.messages) == 1
    subject, body = sender.messages[0]
    assert subject == "Shipping document escalation: gross_weight_kg"
    assert "SI value: 21,577 KG" in body
    assert "BL value: 20,000 KG" in body
    assert "Reviewer action: Checked the source values in both documents." in body
    assert "Requested decision: Approve the SI value or request a corrected BL." in body
    assert "ACME EXPORT LTD" not in body


def test_failed_delivery_can_be_resent_without_another_review_record() -> None:
    seed_mismatch_case("email_escalation_resend")
    main.escalation_service.sender_factory = lambda: FailingSender()
    client = TestClient(main.app)

    created = client.post(
        "/api/cases/email_escalation_resend/reviews",
        json=escalation_payload(),
    )
    failed = client.get(
        "/api/cases/email_escalation_resend/escalations"
    ).json()["assignments"][0]
    review_count_before = len(
        client.get("/api/cases/email_escalation_resend/reviews").json()["reviews"]
    )
    successful_sender = RecordingSender()
    main.escalation_service.sender_factory = lambda: successful_sender

    resent = client.post(f"/api/escalations/{failed['assignment_id']}/resend")
    reviews_after = client.get(
        "/api/cases/email_escalation_resend/reviews"
    ).json()["reviews"]

    assert created.status_code == 201
    assert failed["delivery_status"] == "FAILED"
    assert failed["delivery_attempts"][0]["error_reason"] == (
        "Supervisor email delivery failed."
    )
    assert "secret" not in failed["delivery_attempts"][0]["error_reason"]
    assert resent.status_code == 200
    assert resent.json()["delivery_status"] == "SENT"
    assert [attempt["status"] for attempt in resent.json()["delivery_attempts"]] == [
        "FAILED",
        "SENT",
    ]
    assert [attempt["attempt_number"] for attempt in resent.json()["delivery_attempts"]] == [
        1,
        2,
    ]
    assert len(reviews_after) == review_count_before == 1
    assert reviews_after[0]["action"] == "ESCALATE"
    assert len(successful_sender.messages) == 1
    events = main.escalation_store._events[UUID(failed["assignment_id"])]
    assert [event.delivery_status for event in events] == [None, "FAILED", "SENT"]


def test_non_failed_delivery_cannot_be_resent() -> None:
    seed_mismatch_case("email_escalation_no_resend")
    sender = RecordingSender()
    main.escalation_service.sender_factory = lambda: sender
    client = TestClient(main.app)
    client.post(
        "/api/cases/email_escalation_no_resend/reviews",
        json=escalation_payload(),
    )
    assignment = client.get(
        "/api/cases/email_escalation_no_resend/escalations"
    ).json()["assignments"][0]

    response = client.post(
        f"/api/escalations/{assignment['assignment_id']}/resend"
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Only FAILED escalation email deliveries can be resent."
    }
    assert len(sender.messages) == 1


def test_review_is_appended_before_assignment_delivery(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seed_mismatch_case("email_escalation_order")
    observed: list[str] = []

    async def observe(review, request):
        reviews = main.human_review_store.list(review.target_type, review.target_id)
        assert reviews[-1].review_id == review.review_id
        observed.append(str(review.review_id))

    monkeypatch.setattr(main.escalation_service, "create", observe)

    response = TestClient(main.app).post(
        "/api/cases/email_escalation_order/reviews",
        json=escalation_payload(),
    )

    assert response.status_code == 201
    assert observed == [response.json()["review_id"]]


def test_upload_comparison_escalation_uses_upload_field_values() -> None:
    client = TestClient(main.app)
    uploaded = client.post(
        "/api/compare-upload",
        files=(
            ("si_file", ("si.txt", SI_TEXT, "text/plain")),
            ("bl_file", ("bl.txt", BL_TEXT, "text/plain")),
        ),
    ).json()

    created = client.post(
        f"/api/upload-comparisons/{uploaded['comparison_id']}/reviews",
        json=escalation_payload(),
    )
    assignments = client.get(
        f"/api/upload-comparisons/{uploaded['comparison_id']}/escalations"
    ).json()["assignments"]

    assert created.status_code == 201
    assert len(assignments) == 1
    assert assignments[0]["target_type"] == "UPLOAD_COMPARISON"
    assert assignments[0]["si_value"] == "21,577 KG"
    assert assignments[0]["bl_value"] == "20,000 KG"


def test_unknown_assignment_resend_returns_404() -> None:
    response = TestClient(main.app).post(
        "/api/escalations/00000000-0000-0000-0000-000000000000/resend"
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Escalation assignment not found."}


def test_invalid_smtp_port_is_treated_as_not_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seed_mismatch_case("email_escalation_bad_smtp")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "system@example.com")
    monkeypatch.setenv("SUPERVISOR_EMAIL", "supervisor@example.com")
    monkeypatch.setenv("SMTP_PORT", "not-a-port")

    response = TestClient(main.app).post(
        "/api/cases/email_escalation_bad_smtp/reviews",
        json=escalation_payload(),
    )

    assert response.status_code == 201
    assignment = TestClient(main.app).get(
        "/api/cases/email_escalation_bad_smtp/escalations"
    ).json()["assignments"][0]
    assert assignment["delivery_status"] == "NOT_CONFIGURED"
