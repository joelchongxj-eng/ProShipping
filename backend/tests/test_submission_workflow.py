import copy

import pytest
from fastapi.testclient import TestClient

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
    def __init__(self, recipient: str, messages: list[tuple[str, str, str]]) -> None:
        self.recipient = recipient
        self.messages = messages

    async def send(self, subject: str, body: str) -> None:
        self.messages.append((self.recipient, subject, body))


class FailingSender(RecordingSender):
    async def send(self, subject: str, body: str) -> None:
        raise RuntimeError("secret SMTP detail")


def seed_case(email_id: str, sender: str = "shipping@example.com") -> CaseRecord:
    result = compare_document_pair(
        f"attachments/{email_id}_SI.txt",
        SI_TEXT,
        f"attachments/{email_id}_BL.txt",
        BL_TEXT,
    )
    case = CaseRecord(
        email=EmailRecord(
            email_id=email_id,
            **{"from": sender},
            subject=f"Compare SI and BL for {email_id}",
            body="Private email body must not enter submission workflow.",
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


def escalate(client: TestClient, email_id: str):
    return client.post(
        f"/api/cases/{email_id}/reviews",
        json={
            "scope": "FIELD",
            "field": "gross_weight_kg",
            "side": "BOTH",
            "action": "ESCALATE",
            "escalation_reason": "The SI and BL weights differ.",
            "reviewer_action": "Checked both source values.",
            "requested_decision": "Choose the approved weight.",
        },
    )


def request_information(client: TestClient, email_id: str):
    return client.post(
        f"/api/cases/{email_id}/reviews",
        json={
            "scope": "FIELD",
            "field": "gross_weight_kg",
            "side": "BOTH",
            "action": "REQUEST_INFORMATION",
            "request_reason": "Please confirm the correct gross weight.",
        },
    )


@pytest.fixture(autouse=True)
def clear_workflow_state(monkeypatch: pytest.MonkeyPatch):
    main.cases.clear()
    main.human_review_store.clear()
    main.escalation_store.clear()
    workflow_store = getattr(main, "submission_workflow_store", None)
    if workflow_store is not None:
        workflow_store.clear()
    messages: list[tuple[str, str, str]] = []
    workflow_service = getattr(main, "submission_workflow_service", None)
    if workflow_service is not None:
        original_factory = workflow_service.sender_factory
        original_lookup = workflow_service.supervisor_email_lookup
        workflow_service.sender_factory = lambda recipient: RecordingSender(recipient, messages)
        workflow_service.supervisor_email_lookup = lambda: "supervisor@example.com"
    else:
        original_factory = original_lookup = None
    yield messages
    main.cases.clear()
    main.human_review_store.clear()
    main.escalation_store.clear()
    if workflow_store is not None:
        workflow_store.clear()
    if workflow_service is not None:
        workflow_service.sender_factory = original_factory
        workflow_service.supervisor_email_lookup = original_lookup


def test_escalate_queues_supervisor_item_without_sending(clear_workflow_state) -> None:
    seed_case("email_supervisor")
    original = copy.deepcopy(main.cases["email_supervisor"].model_dump(mode="json"))
    client = TestClient(main.app)

    created = escalate(client, "email_supervisor")
    workflow = client.get("/api/submission-workflow")
    reviews = client.get("/api/cases/email_supervisor/reviews").json()["reviews"]

    assert created.status_code == 201
    assert reviews[-1]["review_status"] == "ESCALATED"
    assert clear_workflow_state == []
    assert workflow.status_code == 200
    section = workflow.json()["supervisor"]
    assert section["status"] == "DRAFT"
    assert section["items"][0] == {
        "target_type": "COMPETITION_CASE",
        "target_id": "email_supervisor",
        "subject": "Compare SI and BL for email_supervisor",
        "sender_email": None,
        "automated_status": "MISMATCH",
        "review_reason": None,
        "field": "gross_weight_kg",
        "si_value": "21,577 KG",
        "bl_value": "20,000 KG",
        "reason": "The SI and BL weights differ.",
        "source_review_id": reviews[-1]["review_id"],
        "added_at": reviews[-1]["created_at"],
    }
    assert "body" not in section["items"][0]
    assert "attachments" not in section["items"][0]
    assert main.cases["email_supervisor"].model_dump(mode="json") == original


def test_remove_supervisor_item_preserves_review_history() -> None:
    seed_case("email_remove")
    client = TestClient(main.app)
    escalate(client, "email_remove")

    removed = client.delete("/api/submission-workflow/supervisor/email_remove")
    workflow = client.get("/api/submission-workflow").json()
    reviews = client.get("/api/cases/email_remove/reviews").json()["reviews"]

    assert removed.status_code == 204
    assert workflow["supervisor"]["items"] == []
    assert [review["action"] for review in reviews] == ["ESCALATE"]


def test_supervisor_submit_sends_one_batch_and_stores_snapshot(clear_workflow_state) -> None:
    client = TestClient(main.app)
    for email_id in ("email_101", "email_205"):
        seed_case(email_id)
        escalate(client, email_id)

    sent = client.post("/api/submission/supervisor/submit")
    workflow = client.get("/api/submission-workflow").json()["supervisor"]

    assert sent.status_code == 200
    assert workflow["status"] == "SUBMITTED"
    assert len(clear_workflow_state) == 1
    recipient, subject, body = clear_workflow_state[0]
    assert recipient == "supervisor@example.com"
    assert subject == "Supervisor Shipping Document Escalations"
    assert "email_101" in body and "email_205" in body
    assert set(sent.json()["successful_snapshot_target_ids"]) == {"email_101", "email_205"}


def test_supervisor_update_tracks_added_and_removed_cases(clear_workflow_state) -> None:
    client = TestClient(main.app)
    seed_case("email_old")
    escalate(client, "email_old")
    client.post("/api/submission/supervisor/submit")
    seed_case("email_new")
    escalate(client, "email_new")
    client.delete("/api/submission-workflow/supervisor/email_old")

    before = client.get("/api/submission-workflow").json()["supervisor"]
    updated = client.post("/api/submission/supervisor/update")
    after = client.get("/api/submission-workflow").json()["supervisor"]

    assert before["status"] == "UPDATE_REQUIRED"
    assert before["added_since_last_send"] == 1
    assert before["removed_since_last_send"] == 1
    assert updated.status_code == 200
    assert updated.json()["added_target_ids"] == ["email_new"]
    assert updated.json()["removed_target_ids"] == ["email_old"]
    assert after["status"] == "SUBMITTED"
    assert clear_workflow_state[-1][1] == "Update to Supervisor Escalation"


def test_failed_supervisor_submit_is_not_submitted_and_can_be_resent() -> None:
    seed_case("email_failure")
    client = TestClient(main.app)
    escalate(client, "email_failure")
    main.submission_workflow_service.sender_factory = lambda recipient: FailingSender(recipient, [])

    failed = client.post("/api/submission/supervisor/submit")
    workflow = client.get("/api/submission-workflow").json()["supervisor"]

    assert failed.status_code == 200
    assert failed.json()["outcomes"][0]["status"] == "FAILED"
    assert "secret" not in (failed.json()["outcomes"][0]["error_reason"] or "")
    assert workflow["status"] == "DRAFT"

    messages: list[tuple[str, str, str]] = []
    main.submission_workflow_service.sender_factory = lambda recipient: RecordingSender(recipient, messages)
    resent = client.post(f"/api/submission/dispatches/{failed.json()['dispatch_id']}/resend")
    assert resent.status_code == 200
    assert resent.json()["dispatch_type"] == "RESEND"
    assert client.get("/api/submission-workflow").json()["supervisor"]["status"] == "SUBMITTED"
    assert len(client.get("/api/cases/email_failure/reviews").json()["reviews"]) == 1


def test_request_information_queues_sender_item_without_sending(clear_workflow_state) -> None:
    seed_case("email_sender", sender="sender@example.com")
    client = TestClient(main.app)

    created = request_information(client, "email_sender")
    workflow = client.get("/api/submission-workflow").json()["sender_follow_up"]

    assert created.status_code == 201
    assert created.json()["review_status"] == "INFORMATION_REQUESTED"
    assert clear_workflow_state == []
    assert workflow["status"] == "DRAFT"
    assert workflow["items"][0]["sender_email"] == "sender@example.com"
    assert workflow["items"][0]["reason"] == "Please confirm the correct gross weight."


def test_sender_send_groups_and_isolates_recipients(clear_workflow_state) -> None:
    client = TestClient(main.app)
    for email_id, sender in (
        ("email_a1", "a@example.com"),
        ("email_a2", "a@example.com"),
        ("email_b1", "b@example.com"),
    ):
        seed_case(email_id, sender)
        request_information(client, email_id)

    sent = client.post("/api/submission/sender/send")

    assert sent.status_code == 200
    assert len(clear_workflow_state) == 2
    by_recipient = {recipient: body for recipient, _, body in clear_workflow_state}
    assert "email_a1" in by_recipient["a@example.com"]
    assert "email_a2" in by_recipient["a@example.com"]
    assert "email_b1" not in by_recipient["a@example.com"]
    assert "email_b1" in by_recipient["b@example.com"]
    assert "email_a1" not in by_recipient["b@example.com"]
    assert client.get("/api/submission-workflow").json()["sender_follow_up"]["status"] == "SUBMITTED"


def test_partial_sender_failure_is_update_required(clear_workflow_state) -> None:
    client = TestClient(main.app)
    for email_id, sender in (("email_a", "a@example.com"), ("email_b", "b@example.com")):
        seed_case(email_id, sender)
        request_information(client, email_id)
    messages: list[tuple[str, str, str]] = []
    main.submission_workflow_service.sender_factory = lambda recipient: (
        FailingSender(recipient, messages)
        if recipient == "b@example.com"
        else RecordingSender(recipient, messages)
    )

    sent = client.post("/api/submission/sender/send")
    section = client.get("/api/submission-workflow").json()["sender_follow_up"]

    assert {outcome["recipient"]: outcome["status"] for outcome in sent.json()["outcomes"]} == {
        "a@example.com": "SENT",
        "b@example.com": "FAILED",
    }
    assert section["status"] == "UPDATE_REQUIRED"

    update = client.post("/api/submission/sender/update")
    assert update.status_code == 409
    assert update.json() == {
        "detail": "Failed sender deliveries must be resent before sending an update."
    }


def test_sender_update_reports_only_relevant_recipient_changes(clear_workflow_state) -> None:
    client = TestClient(main.app)
    seed_case("email_a", "a@example.com")
    request_information(client, "email_a")
    seed_case("email_b", "b@example.com")
    request_information(client, "email_b")
    client.post("/api/submission/sender/send")
    client.delete("/api/submission-workflow/sender/email_a")
    seed_case("email_b2", "b@example.com")
    request_information(client, "email_b2")
    clear_workflow_state.clear()

    updated = client.post("/api/submission/sender/update")

    assert updated.status_code == 200
    by_recipient = {recipient: body for recipient, _, body in clear_workflow_state}
    assert "Removed" in by_recipient["a@example.com"] and "email_a" in by_recipient["a@example.com"]
    assert "New" in by_recipient["b@example.com"] and "email_b2" in by_recipient["b@example.com"]
    assert "email_b2" not in by_recipient["a@example.com"]


def test_sender_update_after_removing_all_items_returns_to_submitted() -> None:
    seed_case("email_only", "only@example.com")
    client = TestClient(main.app)
    request_information(client, "email_only")
    client.post("/api/submission/sender/send")
    client.delete("/api/submission-workflow/sender/email_only")

    updated = client.post("/api/submission/sender/update")
    section = client.get("/api/submission-workflow").json()["sender_follow_up"]

    assert updated.status_code == 200
    assert updated.json()["removed_target_ids"] == ["email_only"]
    assert section["items"] == []
    assert section["status"] == "SUBMITTED"


def test_competition_submission_endpoint_is_unchanged() -> None:
    seed_case("email_competition")
    client = TestClient(main.app)
    before = client.get("/api/submission").json()
    escalate(client, "email_competition")

    assert client.get("/api/submission").json() == before
    assert "supervisor" not in before


def test_not_configured_supervisor_dispatch_can_be_resent_after_configuration() -> None:
    seed_case("email_not_configured")
    client = TestClient(main.app)
    escalate(client, "email_not_configured")
    main.submission_workflow_service.supervisor_email_lookup = lambda: None

    failed = client.post("/api/submission/supervisor/submit")
    assert failed.json()["outcomes"][0]["status"] == "NOT_CONFIGURED"

    messages: list[tuple[str, str, str]] = []
    main.submission_workflow_service.supervisor_email_lookup = lambda: "supervisor@example.com"
    main.submission_workflow_service.sender_factory = lambda recipient: RecordingSender(recipient, messages)
    resent = client.post(f"/api/submission/dispatches/{failed.json()['dispatch_id']}/resend")

    assert resent.status_code == 200
    assert resent.json()["outcomes"][0]["status"] == "SENT"
    assert messages[0][0] == "supervisor@example.com"
    assert client.get("/api/submission-workflow").json()["supervisor"]["status"] == "SUBMITTED"


def test_sender_remove_preserves_request_information_review() -> None:
    seed_case("email_sender_remove", "sender@example.com")
    client = TestClient(main.app)
    request_information(client, "email_sender_remove")

    removed = client.delete("/api/submission-workflow/sender/email_sender_remove")
    reviews = client.get("/api/cases/email_sender_remove/reviews").json()["reviews"]

    assert removed.status_code == 204
    assert client.get("/api/submission-workflow").json()["sender_follow_up"]["items"] == []
    assert [review["action"] for review in reviews] == ["REQUEST_INFORMATION"]


@pytest.mark.parametrize(
    ("payload_update", "detail"),
    (
        ({"scope": "CASE", "field": None, "side": None}, "REQUEST_INFORMATION requires field scope."),
        ({"side": "SI"}, "REQUEST_INFORMATION requires side BOTH."),
        ({"request_reason": "  "}, "REQUEST_INFORMATION requires request_reason."),
    ),
)
def test_request_information_validation(payload_update, detail) -> None:
    seed_case("email_request_validation")
    payload = {
        "scope": "FIELD",
        "field": "gross_weight_kg",
        "side": "BOTH",
        "action": "REQUEST_INFORMATION",
        "request_reason": "Clarify the weight.",
        **payload_update,
    }

    response = TestClient(main.app).post(
        "/api/cases/email_request_validation/reviews",
        json=payload,
    )

    assert response.status_code == 422
    assert response.json() == {"detail": detail}


def test_workflow_get_is_read_only_and_exposes_no_secrets(monkeypatch) -> None:
    seed_case("email_read_only")
    client = TestClient(main.app)
    escalate(client, "email_read_only")
    monkeypatch.setenv("SMTP_PASSWORD", "never-expose-this")
    monkeypatch.setenv("GROQ_API_KEY", "never-expose-groq")

    first = client.get("/api/submission-workflow").json()
    second = client.get("/api/submission-workflow").json()

    assert first == second
    serialized = str(first)
    assert "never-expose-this" not in serialized
    assert "never-expose-groq" not in serialized
    assert "Private email body" not in serialized
