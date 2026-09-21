import pytest
from fastapi.testclient import TestClient
from uuid import UUID

import app.main as main
from app.email_delivery import EmailDeliveryStatus, NotConfiguredEmailDelivery
from app.models import CaseRecord, EmailCategory, EmailRecord
from app.reviews.escalation_service import SMTPEmailSender
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
    workflow_store = getattr(main, "submission_workflow_store", None)
    if workflow_store is not None:
        workflow_store.clear()
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
    if workflow_store is not None:
        workflow_store.clear()
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


def test_escalation_saves_only_relevant_field_without_delivery() -> None:
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
    assert assignment["delivery_status"] is None
    assert assignment["delivery_attempts"] == []


def test_configured_smtp_does_not_send_during_human_review() -> None:
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
    assert assignment["delivery_status"] is None
    assert assignment["supervisor_email"] is None
    assert sender.messages == []


def test_undelivered_assignment_is_not_a_failed_delivery_to_resend() -> None:
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
    resent = client.post(f"/api/escalations/{failed['assignment_id']}/resend")
    reviews_after = client.get(
        "/api/cases/email_escalation_resend/reviews"
    ).json()["reviews"]

    assert created.status_code == 201
    assert failed["delivery_status"] is None
    assert failed["delivery_attempts"] == []
    assert resent.status_code == 409
    assert len(reviews_after) == review_count_before == 1
    assert reviews_after[0]["action"] == "ESCALATE"
    events = main.escalation_store._events[UUID(failed["assignment_id"])]
    assert [event.delivery_status for event in events] == [None]


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
    assert sender.messages == []


def test_review_is_appended_before_assignment_delivery(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seed_mismatch_case("email_escalation_order")
    observed: list[str] = []

    original_create = main.escalation_service.create

    async def observe(review, request):
        reviews = main.human_review_store.list(review.target_type, review.target_id)
        assert reviews[-1].review_id == review.review_id
        observed.append(str(review.review_id))
        return await original_create(review, request)

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


def test_invalid_smtp_port_is_not_consulted_until_submission(
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
    assert assignment["delivery_status"] is None


def test_smtp_sender_uses_starttls_authentication_and_configured_from_address(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    events: list[tuple] = []

    class FakeSMTP:
        def __init__(self, host: str, port: int, timeout: int) -> None:
            events.append(("connect", host, port, timeout))

        def __enter__(self):
            return self

        def __exit__(self, *args) -> None:
            return None

        def starttls(self) -> None:
            events.append(("starttls",))

        def login(self, username: str, password: str) -> None:
            events.append(("login", username, bool(password)))

        def send_message(self, message) -> None:
            events.append(("send", message["From"], message["To"], message["Subject"]))

    monkeypatch.setenv("SMTP_HOST", "smtp.gmail.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "proshipping.demo@gmail.com")
    monkeypatch.setenv("SMTP_USERNAME", "proshipping.demo@gmail.com")
    monkeypatch.setenv("SMTP_USE_TLS", "1")
    monkeypatch.setenv("SMTP_PASSWORD", str(UUID(int=1)))
    monkeypatch.setattr("app.reviews.escalation_service.smtplib.SMTP", FakeSMTP)
    sender = main.submission_workflow_service.sender_factory(
        "controlled-demo@example.com"
    )
    assert sender is not None

    sender._send_sync("Submission test", "Test body")

    assert events[0] == ("connect", "smtp.gmail.com", 587, 15)
    assert events[1] == ("starttls",)
    assert events[2][0:2] == ("login", "proshipping.demo@gmail.com")
    assert events[3] == (
        "send",
        "proshipping.demo@gmail.com",
        "controlled-demo@example.com",
        "Submission test",
    )


@pytest.mark.asyncio
async def test_smtp_sender_returns_normalized_not_configured_when_authentication_is_incomplete(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SMTP_HOST", "smtp.gmail.com")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "proshipping.demo@gmail.com")
    monkeypatch.setenv("SMTP_USERNAME", "proshipping.demo@gmail.com")
    monkeypatch.delenv("SMTP_PASSWORD", raising=False)

    sender = main.submission_workflow_service.sender_factory(
        "controlled-demo@example.com"
    )

    assert isinstance(sender, NotConfiguredEmailDelivery)
    result = await sender.send("Subject", "Body", idempotency_key="delivery-1")
    assert result.status is EmailDeliveryStatus.NOT_CONFIGURED
    assert result.error_reason == (
        "Email delivery is not configured. Missing configuration: SMTP_PASSWORD."
    )
    assert SMTPEmailSender.missing_configuration_keys("controlled-demo@example.com") == [
        "SMTP_PASSWORD"
    ]
