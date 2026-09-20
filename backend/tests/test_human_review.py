import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.models import CaseRecord, CaseStatus, EmailCategory, EmailRecord, ReviewReason
from app.services.document_pair import compare_document_pair


MATCH_TEXT = b"""Shipper: ACME EXPORT LTD
Consignee: ACME IMPORT LTD
Notify Party: ACME NOTIFY LTD
Port of Loading: PORT KLANG
Port of Discharge: CALLAO
Container Count: 3
Gross Weight (KG): 21,577 KG
"""

MISMATCH_TEXT = MATCH_TEXT.replace(b"21,577 KG", b"20,000 KG")
MISSING_TEXT = MATCH_TEXT.replace(b"Notify Party: ACME NOTIFY LTD\n", b"")


def seed_case(email_id: str, bl_content: bytes) -> CaseRecord:
    result = compare_document_pair(
        f"attachments/{email_id}_SI.txt",
        MATCH_TEXT,
        f"attachments/{email_id}_BL.txt",
        bl_content,
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


@pytest.fixture(autouse=True)
def clear_review_state() -> None:
    main.cases.clear()
    main.human_review_store.clear()
    main.escalation_store.clear()
    main.upload_store.clear()
    yield
    main.cases.clear()
    main.human_review_store.clear()
    main.escalation_store.clear()
    main.upload_store.clear()


def test_match_case_can_be_confirmed_without_mutating_automation() -> None:
    case = seed_case("email_match", MATCH_TEXT)
    automated_before = case.model_dump(mode="json")
    client = TestClient(main.app)

    created = client.post(
        "/api/cases/email_match/reviews",
        json={"scope": "CASE", "action": "CONFIRM"},
    )
    history = client.get("/api/cases/email_match/reviews")
    summary = client.get("/api/cases/email_match/review-summary")

    assert created.status_code == 201
    review = created.json()
    assert review["target_type"] == "COMPETITION_CASE"
    assert review["target_id"] == "email_match"
    assert review["automated_status"] == "MATCH"
    assert review["review_status"] == "CONFIRMED"
    assert review["sequence"] == 1
    assert history.status_code == 200
    assert history.json()["reviews"] == [review]
    assert summary.status_code == 200
    assert summary.json()["review_status"] == "CONFIRMED"
    assert main.cases["email_match"].model_dump(mode="json") == automated_before


def test_latest_correction_becomes_persistent_effective_value() -> None:
    case = seed_case("email_mismatch", MISMATCH_TEXT)
    automated_before = case.model_dump(mode="json")
    client = TestClient(main.app)
    correction = {
        "scope": "FIELD",
        "field": "gross_weight_kg",
        "side": "BL",
        "action": "CORRECT",
        "corrected_value": "21000",
    }

    first = client.post("/api/cases/email_mismatch/reviews", json=correction)
    correction["corrected_value"] = "21577"
    second = client.post("/api/cases/email_mismatch/reviews", json=correction)
    summary = client.get("/api/cases/email_mismatch/review-summary").json()

    assert first.status_code == 201
    assert first.json()["original_value"] == "20,000 KG"
    assert second.status_code == 201
    weight = summary["effective_values"]["gross_weight_kg"]
    assert weight["bl"] == {
        "automated_value": "20,000 KG",
        "reviewed_value": "21577",
        "effective_value": "21577",
    }
    assert summary["review_status"] == "CORRECTED"
    assert main.cases["email_mismatch"].model_dump(mode="json") == automated_before


@pytest.mark.parametrize(
    ("action", "extra", "expected_status"),
    (
        ("CONFIRM", {}, "CONFIRMED"),
        ("ADD_NOTE", {"note": "Checked again."}, "CORRECTED"),
        ("RETRY", {}, "RETRY_REQUESTED"),
        (
            "ESCALATE",
            {
                "side": "BOTH",
                "escalation_reason": "Supervisor decision required.",
                "reviewer_action": "Verified the corrected value.",
                "requested_decision": "Approve the corrected value.",
            },
            "ESCALATED",
        ),
    ),
)
def test_later_review_actions_do_not_erase_corrected_value(
    action: str,
    extra: dict[str, str],
    expected_status: str,
) -> None:
    seed_case("email_mismatch", MISMATCH_TEXT)
    client = TestClient(main.app)
    target = {
        "scope": "FIELD",
        "field": "gross_weight_kg",
        "side": "BL",
    }
    corrected = client.post(
        "/api/cases/email_mismatch/reviews",
        json={**target, "action": "CORRECT", "corrected_value": "21577"},
    )
    later = client.post(
        "/api/cases/email_mismatch/reviews",
        json={**target, "action": action, **extra},
    )
    summary = client.get("/api/cases/email_mismatch/review-summary").json()

    assert corrected.status_code == 201
    assert later.status_code == 201
    assert summary["review_status"] == expected_status
    assert summary["effective_values"]["gross_weight_kg"]["bl"][
        "reviewed_value"
    ] == "21577"
    assert summary["effective_values"]["gross_weight_kg"]["bl"][
        "effective_value"
    ] == "21577"


def test_mismatched_field_can_be_accepted_as_equivalent() -> None:
    seed_case("email_mismatch", MISMATCH_TEXT)
    client = TestClient(main.app)

    created = client.post(
        "/api/cases/email_mismatch/reviews",
        json={
            "scope": "FIELD",
            "field": "gross_weight_kg",
            "side": "BOTH",
            "action": "EQUIVALENT",
            "note": "Business-equivalent after verification.",
        },
    )
    summary = client.get("/api/cases/email_mismatch/review-summary").json()

    assert created.status_code == 201
    assert created.json()["automated_field_status"] == "mismatch"
    assert created.json()["original_si_value"] == "21,577 KG"
    assert created.json()["original_bl_value"] == "20,000 KG"
    assert created.json()["review_status"] == "ACCEPTED_EQUIVALENT"
    assert summary["review_status"] == "ACCEPTED_EQUIVALENT"
    assert summary["effective_values"]["gross_weight_kg"][
        "accepted_equivalent"
    ] is True
    assert main.cases["email_mismatch"].status.value == "MISMATCH"
    assert main.cases["email_mismatch"].comparison[-1].status.value == "mismatch"


def test_needs_review_supports_unreadable_retry_escalate_and_confirm() -> None:
    seed_case("email_review", MISSING_TEXT)
    client = TestClient(main.app)
    requests = (
        {
            "scope": "FIELD",
            "field": "notify_party",
            "side": "BL",
            "action": "UNREADABLE",
        },
        {"scope": "CASE", "action": "RETRY"},
        {
            "scope": "FIELD",
            "field": "notify_party",
            "side": "BOTH",
            "action": "ESCALATE",
            "escalation_reason": "Missing notify party requires a decision.",
            "reviewer_action": "Checked the available SI and BL values.",
            "requested_decision": "Confirm how to handle the missing BL value.",
        },
        {"scope": "CASE", "action": "CONFIRM"},
    )

    responses = [
        client.post("/api/cases/email_review/reviews", json=request)
        for request in requests
    ]
    history = client.get("/api/cases/email_review/reviews").json()["reviews"]

    assert [response.status_code for response in responses] == [201, 201, 201, 201]
    assert [record["review_status"] for record in history] == [
        "UNREADABLE",
        "RETRY_REQUESTED",
        "ESCALATED",
        "CONFIRMED",
    ]
    assert [record["sequence"] for record in history] == [1, 2, 3, 4]
    assert main.cases["email_review"].status.value == "NEEDS_REVIEW"


@pytest.mark.parametrize(
    ("case_content", "payload", "status_code", "detail"),
    (
        (
            MATCH_TEXT,
            {"scope": "CASE", "action": "RETRY"},
            409,
            "RETRY is only valid for MISMATCH or NEEDS_REVIEW.",
        ),
        (
            MATCH_TEXT,
            {
                "scope": "CASE",
                "action": "ESCALATE",
                "escalation_reason": "Not allowed for a match.",
            },
            409,
            "ESCALATE is only valid for MISMATCH or NEEDS_REVIEW.",
        ),
        (
            MATCH_TEXT,
            {
                "scope": "FIELD",
                "field": "shipper",
                "side": "BOTH",
                "action": "EQUIVALENT",
            },
            409,
            "EQUIVALENT requires an existing field-level mismatch.",
        ),
        (
            MISMATCH_TEXT,
            {
                "scope": "FIELD",
                "field": "gross_weight_kg",
                "side": "BL",
                "action": "CORRECT",
            },
            422,
            "CORRECT requires corrected_value.",
        ),
        (
            MISMATCH_TEXT,
            {
                "scope": "FIELD",
                "field": "gross_weight_kg",
                "side": "BOTH",
                "action": "CORRECT",
                "corrected_value": "21577",
            },
            422,
            "CORRECT requires side SI or BL.",
        ),
        (
            MISMATCH_TEXT,
            {"scope": "CASE", "action": "ESCALATE"},
            422,
            "ESCALATE requires escalation_reason.",
        ),
        (
            MATCH_TEXT,
            {"scope": "CASE", "action": "ADD_NOTE"},
            422,
            "ADD_NOTE requires a note.",
        ),
    ),
)
def test_action_status_validation(
    case_content: bytes,
    payload: dict[str, object],
    status_code: int,
    detail: str,
) -> None:
    seed_case("email_validation", case_content)

    response = TestClient(main.app).post(
        "/api/cases/email_validation/reviews",
        json=payload,
    )

    assert response.status_code == status_code
    assert response.json() == {"detail": detail}


@pytest.mark.parametrize(
    "payload",
    (
        {
            "scope": "FIELD",
            "field": "not_a_shipping_field",
            "side": "SI",
            "action": "CONFIRM",
        },
        {
            "scope": "FIELD",
            "field": "shipper",
            "side": "LEFT",
            "action": "CONFIRM",
        },
        {"scope": "CASE", "action": "APPROVE"},
    ),
)
def test_invalid_review_enums_return_validation_error(
    payload: dict[str, str],
) -> None:
    seed_case("email_invalid", MATCH_TEXT)

    response = TestClient(main.app).post(
        "/api/cases/email_invalid/reviews",
        json=payload,
    )

    assert response.status_code == 422


def test_unknown_review_targets_return_404() -> None:
    client = TestClient(main.app)

    case_response = client.get("/api/cases/unknown/reviews")
    upload_response = client.post(
        "/api/upload-comparisons/unknown/reviews",
        json={"scope": "CASE", "action": "CONFIRM"},
    )

    assert case_response.status_code == 404
    assert case_response.json() == {"detail": "Review target not found."}
    assert upload_response.status_code == 404
    assert upload_response.json() == {"detail": "Review target not found."}


def test_upload_comparison_supports_review_without_mutating_upload_result() -> None:
    client = TestClient(main.app)
    uploaded = client.post(
        "/api/compare-upload",
        files=(
            ("si_file", ("si.txt", MATCH_TEXT, "text/plain")),
            ("bl_file", ("bl.txt", MISMATCH_TEXT, "text/plain")),
        ),
    ).json()
    comparison_id = uploaded["comparison_id"]

    created = client.post(
        f"/api/upload-comparisons/{comparison_id}/reviews",
        json={
            "scope": "FIELD",
            "field": "gross_weight_kg",
            "side": "BOTH",
            "action": "EQUIVALENT",
        },
    )
    history = client.get(
        f"/api/upload-comparisons/{comparison_id}/reviews"
    ).json()
    summary = client.get(
        f"/api/upload-comparisons/{comparison_id}/review-summary"
    ).json()
    uploaded_after = client.get(
        f"/api/upload-comparisons/{comparison_id}"
    ).json()

    assert created.status_code == 201
    assert created.json()["target_type"] == "UPLOAD_COMPARISON"
    assert len(history["reviews"]) == 1
    assert summary["review_status"] == "ACCEPTED_EQUIVALENT"
    assert uploaded_after == uploaded


def test_reviews_do_not_change_submission_or_automated_comparison() -> None:
    case = seed_case("email_submission", MISMATCH_TEXT)
    client = TestClient(main.app)
    automated_before = case.model_dump(mode="json")
    submission_before = client.get("/api/submission").json()

    reviewed = client.post(
        "/api/cases/email_submission/reviews",
        json={
            "scope": "FIELD",
            "field": "gross_weight_kg",
            "side": "BL",
            "action": "CORRECT",
            "corrected_value": "21577",
        },
    )

    assert reviewed.status_code == 201
    assert client.get("/api/submission").json() == submission_before
    assert main.cases["email_submission"].model_dump(mode="json") == automated_before


def test_match_supports_correction_and_note_overlay() -> None:
    seed_case("email_match_actions", MATCH_TEXT)
    client = TestClient(main.app)

    corrected = client.post(
        "/api/cases/email_match_actions/reviews",
        json={
            "scope": "FIELD",
            "field": "shipper",
            "side": "SI",
            "action": "CORRECT",
            "corrected_value": "ACME EXPORTS LTD",
        },
    )
    noted = client.post(
        "/api/cases/email_match_actions/reviews",
        json={
            "scope": "FIELD",
            "field": "shipper",
            "side": "SI",
            "action": "ADD_NOTE",
            "note": "Confirmed legal entity suffix.",
        },
    )
    summary = client.get(
        "/api/cases/email_match_actions/review-summary"
    ).json()

    assert corrected.status_code == 201
    assert noted.status_code == 201
    assert noted.json()["review_status"] == "CORRECTED"
    assert summary["effective_values"]["shipper"]["si"]["reviewed_value"] == (
        "ACME EXPORTS LTD"
    )
    assert main.cases["email_match_actions"].status.value == "MATCH"


def test_needs_review_missing_value_can_receive_human_correction() -> None:
    seed_case("email_missing_correction", MISSING_TEXT)
    client = TestClient(main.app)

    corrected = client.post(
        "/api/cases/email_missing_correction/reviews",
        json={
            "scope": "FIELD",
            "field": "notify_party",
            "side": "BL",
            "action": "CORRECT",
            "corrected_value": "ACME NOTIFY LTD",
        },
    )
    summary = client.get(
        "/api/cases/email_missing_correction/review-summary"
    ).json()

    assert corrected.status_code == 201
    assert corrected.json()["original_value"] is None
    assert summary["effective_values"]["notify_party"]["bl"] == {
        "automated_value": None,
        "reviewed_value": "ACME NOTIFY LTD",
        "effective_value": "ACME NOTIFY LTD",
    }
    assert main.cases["email_missing_correction"].status.value == "NEEDS_REVIEW"


def test_case_level_unreadable_identifies_document_side() -> None:
    seed_case("email_unreadable", MISSING_TEXT)

    response = TestClient(main.app).post(
        "/api/cases/email_unreadable/reviews",
        json={
            "scope": "CASE",
            "side": "BL",
            "action": "UNREADABLE",
            "note": "The BL scan cannot be read reliably.",
        },
    )

    assert response.status_code == 201
    assert response.json()["review_status"] == "UNREADABLE"
    assert response.json()["side"] == "BL"


def test_escalation_note_preserves_active_escalation_and_resolution_keeps_history() -> None:
    seed_case("email_escalation", MISMATCH_TEXT)
    client = TestClient(main.app)
    target = {
        "scope": "FIELD",
        "field": "gross_weight_kg",
        "side": "BOTH",
    }

    escalated = client.post(
        "/api/cases/email_escalation/reviews",
        json={
            **target,
            "action": "ESCALATE",
            "escalation_reason": "Supervisor must approve the weight difference.",
            "reviewer_action": "Rechecked both document values.",
            "requested_decision": "Choose the approved gross weight.",
        },
    )
    noted = client.post(
        "/api/cases/email_escalation/reviews",
        json={**target, "action": "ADD_NOTE", "note": "Documents rechecked."},
    )
    active = client.get("/api/cases/email_escalation/review-summary").json()
    resolved = client.post(
        "/api/cases/email_escalation/reviews",
        json={**target, "action": "CONFIRM"},
    )
    final_summary = client.get(
        "/api/cases/email_escalation/review-summary"
    ).json()
    history = client.get("/api/cases/email_escalation/reviews").json()["reviews"]

    assert escalated.status_code == 201
    assert noted.status_code == 201
    assert active["is_escalated"] is True
    assert active["escalation_reason"] == (
        "Supervisor must approve the weight difference."
    )
    assert resolved.status_code == 201
    assert final_summary["is_escalated"] is False
    assert final_summary["review_status"] == "CONFIRMED"
    assert [record["action"] for record in history] == [
        "ESCALATE",
        "ADD_NOTE",
        "CONFIRM",
    ]


def test_retry_is_audit_request_only_and_does_not_rerun_automation() -> None:
    case = seed_case("email_retry", MISMATCH_TEXT)
    automated_before = case.model_dump(mode="json")

    response = TestClient(main.app).post(
        "/api/cases/email_retry/reviews",
        json={"scope": "CASE", "action": "RETRY"},
    )

    assert response.status_code == 201
    assert response.json()["review_status"] == "RETRY_REQUESTED"
    assert main.cases["email_retry"].model_dump(mode="json") == automated_before


def test_unreviewed_target_summary_is_pending() -> None:
    seed_case("email_pending", MATCH_TEXT)

    response = TestClient(main.app).get(
        "/api/cases/email_pending/review-summary"
    )

    assert response.status_code == 200
    assert response.json()["review_status"] == "PENDING"
    assert response.json()["review_count"] == 0


def test_unreadable_rejects_a_side_with_no_attachment() -> None:
    email_id = "email_missing_attachment"
    main.cases[email_id] = CaseRecord(
        email=EmailRecord(
            email_id=email_id,
            **{"from": "shipping@example.com"},
            subject="Missing BL",
            body="Only SI was attached.",
            attachments=[f"attachments/{email_id}_SI.txt"],
        ),
        category=EmailCategory.BL_COMPARISON,
        status=CaseStatus.NEEDS_REVIEW,
        si_attachment=f"attachments/{email_id}_SI.txt",
        review_reason=ReviewReason.MISSING_ATTACHMENT,
    )

    response = TestClient(main.app).post(
        f"/api/cases/{email_id}/reviews",
        json={
            "scope": "CASE",
            "side": "BL",
            "action": "UNREADABLE",
            "note": "Attempted to inspect the BL.",
        },
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "UNREADABLE requires an existing attachment for the selected side."
    }


def test_failed_case_is_outside_human_review_workflow() -> None:
    case = seed_case("email_failed", MATCH_TEXT)
    main.cases["email_failed"] = case.model_copy(
        update={"status": CaseStatus.FAILED}
    )

    response = TestClient(main.app).post(
        "/api/cases/email_failed/reviews",
        json={"scope": "CASE", "action": "CONFIRM"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "FAILED targets are not reviewable."}


def test_expired_upload_comparison_is_not_reviewable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main.upload_store, "ttl_seconds", 0)
    client = TestClient(main.app)
    uploaded = client.post(
        "/api/compare-upload",
        files=(
            ("si_file", ("si.txt", MATCH_TEXT, "text/plain")),
            ("bl_file", ("bl.txt", MATCH_TEXT, "text/plain")),
        ),
    ).json()

    response = client.post(
        f"/api/upload-comparisons/{uploaded['comparison_id']}/reviews",
        json={"scope": "CASE", "action": "CONFIRM"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Review target not found."}


def test_summary_uses_the_most_recent_active_escalation() -> None:
    seed_case("email_multi_escalation", MISMATCH_TEXT)
    client = TestClient(main.app)
    gross_weight = {
        "scope": "FIELD",
        "field": "gross_weight_kg",
        "side": "BOTH",
    }
    shipper = {
        "scope": "FIELD",
        "field": "shipper",
        "side": "BOTH",
    }

    client.post(
        "/api/cases/email_multi_escalation/reviews",
        json={
            **gross_weight,
            "action": "ESCALATE",
            "escalation_reason": "First weight escalation.",
            "reviewer_action": "Checked the weight evidence.",
            "requested_decision": "Choose the correct weight.",
        },
    )
    client.post(
        "/api/cases/email_multi_escalation/reviews",
        json={
            **shipper,
            "action": "ESCALATE",
            "escalation_reason": "Shipper escalation.",
            "reviewer_action": "Checked the shipper evidence.",
            "requested_decision": "Choose the correct shipper.",
        },
    )
    client.post(
        "/api/cases/email_multi_escalation/reviews",
        json={**gross_weight, "action": "CONFIRM"},
    )
    client.post(
        "/api/cases/email_multi_escalation/reviews",
        json={
            **gross_weight,
            "action": "ESCALATE",
            "escalation_reason": "Newest weight escalation.",
            "reviewer_action": "Rechecked the latest evidence.",
            "requested_decision": "Approve the latest weight decision.",
        },
    )

    summary = client.get(
        "/api/cases/email_multi_escalation/review-summary"
    ).json()

    assert summary["escalation_reason"] == "Newest weight escalation."
