from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.models import CaseRecord, CaseStatus, EmailCategory, EmailRecord
from app.reviews.models import (
    CreateHumanReviewRequest,
    ReviewAction,
    ReviewScope,
    ReviewSide,
    ReviewTargetType,
    ShippingFieldName,
)
from app.reviews.retry import RetryExecutionStatus
from app.services.document_pair import compare_document_pair


SI_TEXT = b"""Shipper: ACME EXPORT LTD
Consignee: ACME IMPORT LTD
Notify Party: ACME NOTIFY LTD
Port of Loading: PORT KLANG
Port of Discharge: CALLAO
Container Count: 3
Gross Weight (KG): 21,577 KG
"""
BL_MISMATCH_TEXT = SI_TEXT.replace(b"21,577 KG", b"20,000 KG")
BL_MISSING_TEXT = SI_TEXT.replace(b"Notify Party: ACME NOTIFY LTD\n", b"")


def seed_case(
    email_id: str,
    bl_content: bytes,
    *,
    sender: str = "shipping@example.com",
    subject: str = "Compare shipping documents",
) -> CaseRecord:
    result = compare_document_pair(
        f"attachments/{email_id}_SI.txt",
        SI_TEXT,
        f"attachments/{email_id}_BL.txt",
        bl_content,
    )
    case = CaseRecord(
        email=EmailRecord(
            email_id=email_id,
            **{"from": sender},
            subject=subject,
            body="Sensitive full email body must not enter the queue.",
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
def clear_queue_state() -> None:
    main.cases.clear()
    main.human_review_store.clear()
    main.retry_execution_store.clear()
    main.escalation_store.clear()
    main.upload_store.clear()
    yield
    main.cases.clear()
    main.human_review_store.clear()
    main.retry_execution_store.clear()
    main.escalation_store.clear()
    main.upload_store.clear()


def test_default_queue_includes_attention_cases_and_excludes_match() -> None:
    seed_case("email_003", SI_TEXT)
    mismatch = seed_case("email_002", BL_MISMATCH_TEXT)
    needs_review = seed_case("email_001", BL_MISSING_TEXT)

    response = TestClient(main.app).get("/api/review-queue")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert payload["offset"] == 0
    assert payload["limit"] == 50
    assert [item["email_id"] for item in payload["items"]] == [
        "email_001",
        "email_002",
    ]
    assert [item["automated_status"] for item in payload["items"]] == [
        needs_review.status.value,
        mismatch.status.value,
    ]
    assert payload["items"][0]["review_reason"] == "missing_value"
    assert payload["items"][1]["review_reason"] is None


def test_unreviewed_queue_item_is_pending_and_does_not_fabricate_data() -> None:
    seed_case("email_pending", BL_MISMATCH_TEXT)

    item = TestClient(main.app).get("/api/review-queue").json()["items"][0]

    assert item["target_type"] == "COMPETITION_CASE"
    assert item["target_id"] == "email_pending"
    assert item["human_review_status"] == "PENDING"
    assert item["has_human_review"] is False
    assert item["last_reviewed_at"] is None
    assert item["received_at"] is None
    assert "classification_confidence" not in item
    assert "classification_uncertain" not in item
    assert "body" not in item
    assert "attachments" not in item


@pytest.mark.parametrize(
    ("review_request", "expected_status"),
    (
        (
            CreateHumanReviewRequest(scope=ReviewScope.CASE, action=ReviewAction.CONFIRM),
            "CONFIRMED",
        ),
        (
            CreateHumanReviewRequest(
                scope=ReviewScope.FIELD,
                field=ShippingFieldName.GROSS_WEIGHT_KG,
                side=ReviewSide.BL,
                action=ReviewAction.CORRECT,
                corrected_value="21577",
            ),
            "CORRECTED",
        ),
        (
            CreateHumanReviewRequest(
                scope=ReviewScope.FIELD,
                field=ShippingFieldName.GROSS_WEIGHT_KG,
                side=ReviewSide.BOTH,
                action=ReviewAction.EQUIVALENT,
            ),
            "ACCEPTED_EQUIVALENT",
        ),
        (
            CreateHumanReviewRequest(
                scope=ReviewScope.FIELD,
                field=ShippingFieldName.GROSS_WEIGHT_KG,
                side=ReviewSide.BL,
                action=ReviewAction.UNREADABLE,
            ),
            "UNREADABLE",
        ),
    ),
)
def test_queue_uses_existing_human_review_summary_status(
    review_request: CreateHumanReviewRequest,
    expected_status: str,
) -> None:
    case = seed_case("email_reviewed", BL_MISMATCH_TEXT)
    original = case.model_dump(mode="json")
    review = main.human_review_service.create(
        ReviewTargetType.COMPETITION_CASE,
        "email_reviewed",
        review_request,
    )

    item = TestClient(main.app).get("/api/review-queue").json()["items"][0]

    assert item["automated_status"] == "MISMATCH"
    assert item["human_review_status"] == expected_status
    assert item["has_human_review"] is True
    assert item["last_reviewed_at"] == review.created_at.isoformat().replace("+00:00", "Z")
    assert item["latest_review_action"] == review_request.action.value
    assert item["latest_review_id"] == str(review.review_id)
    assert main.cases["email_reviewed"].model_dump(mode="json") == original


def test_queue_aggregates_active_escalation_and_delivery_status() -> None:
    seed_case("email_escalated", BL_MISMATCH_TEXT)
    client = TestClient(main.app)
    created = client.post(
        "/api/cases/email_escalated/reviews",
        json={
            "scope": "FIELD",
            "field": "gross_weight_kg",
            "side": "BOTH",
            "action": "ESCALATE",
            "escalation_reason": "Supervisor must choose the weight.",
            "reviewer_action": "Checked both source values.",
            "requested_decision": "Choose the approved gross weight.",
        },
    )

    item = client.get("/api/review-queue").json()["items"][0]

    assert created.status_code == 201
    assert item["human_review_status"] == "ESCALATED"
    assert item["is_escalated"] is True
    assert item["active_escalation_reason"] == "Supervisor must choose the weight."
    assert item["latest_email_delivery_status"] == "NOT_CONFIGURED"
    filtered = client.get(
        "/api/review-queue",
        params={"is_escalated": "true"},
    ).json()
    assert [row["email_id"] for row in filtered["items"]] == ["email_escalated"]


def test_queue_aggregates_retry_request_and_latest_execution() -> None:
    case = seed_case("email_retry", BL_MISMATCH_TEXT)
    original = case.model_dump(mode="json")
    review = main.human_review_service.create(
        ReviewTargetType.COMPETITION_CASE,
        "email_retry",
        CreateHumanReviewRequest(scope=ReviewScope.CASE, action=ReviewAction.RETRY),
    )
    pending = main.retry_execution_store.create_pending(
        target_type=ReviewTargetType.COMPETITION_CASE,
        target_id="email_retry",
        requested_review_id=review.review_id,
        previous_automated_status=case.status,
        previous_result_hash=review.automated_result_hash,
    )
    main.retry_execution_store.transition(
        pending.retry_id,
        execution_status=RetryExecutionStatus.SUCCEEDED,
        started_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
        new_automated_status=CaseStatus.MATCH,
        new_result_hash="new-result-hash",
    )

    item = TestClient(main.app).get("/api/review-queue").json()["items"][0]

    assert item["retry_requested"] is True
    assert item["human_review_status"] == "RETRY_REQUESTED"
    assert item["latest_retry_execution_status"] == "SUCCEEDED"
    assert item["latest_retry_attempt_number"] == 1
    assert item["automated_status"] == "MISMATCH"
    assert main.cases["email_retry"].model_dump(mode="json") == original
    filtered = TestClient(main.app).get(
        "/api/review-queue",
        params={"retry_requested": "true"},
    ).json()
    assert [row["email_id"] for row in filtered["items"]] == ["email_retry"]


def test_queue_search_pagination_and_total_before_pagination() -> None:
    seed_case(
        "email_010",
        BL_MISMATCH_TEXT,
        sender="ops@alpha.test",
        subject="Alpha document check",
    )
    seed_case(
        "email_020",
        BL_MISMATCH_TEXT,
        sender="beta@example.com",
        subject="Special Vessel Documents",
    )
    seed_case(
        "email_030",
        BL_MISSING_TEXT,
        sender="gamma@example.com",
        subject="Missing field",
    )
    client = TestClient(main.app)

    by_id = client.get("/api/review-queue", params={"search": "EMAIL_020"}).json()
    by_subject = client.get(
        "/api/review-queue", params={"search": "special vessel"}
    ).json()
    by_sender = client.get("/api/review-queue", params={"search": "OPS@ALPHA"}).json()
    paged = client.get(
        "/api/review-queue", params={"offset": 1, "limit": 1}
    ).json()

    assert [item["email_id"] for item in by_id["items"]] == ["email_020"]
    assert [item["email_id"] for item in by_subject["items"]] == ["email_020"]
    assert [item["email_id"] for item in by_sender["items"]] == ["email_010"]
    assert paged["total"] == 3
    assert paged["offset"] == 1
    assert paged["limit"] == 1
    assert [item["email_id"] for item in paged["items"]] == ["email_020"]


def test_queue_filters_and_explicit_match_inclusion() -> None:
    seed_case("email_match", SI_TEXT)
    seed_case("email_mismatch", BL_MISMATCH_TEXT)
    seed_case("email_needs_review", BL_MISSING_TEXT)
    main.human_review_service.create(
        ReviewTargetType.COMPETITION_CASE,
        "email_mismatch",
        CreateHumanReviewRequest(scope=ReviewScope.CASE, action=ReviewAction.CONFIRM),
    )
    client = TestClient(main.app)

    mismatch = client.get(
        "/api/review-queue", params={"automated_status": "MISMATCH"}
    ).json()
    confirmed = client.get(
        "/api/review-queue", params={"human_review_status": "CONFIRMED"}
    ).json()
    escalated = client.get(
        "/api/review-queue", params={"is_escalated": "false"}
    ).json()
    retries = client.get(
        "/api/review-queue", params={"retry_requested": "false"}
    ).json()
    with_match = client.get(
        "/api/review-queue", params={"include_match": "true"}
    ).json()

    assert [item["email_id"] for item in mismatch["items"]] == ["email_mismatch"]
    assert [item["email_id"] for item in confirmed["items"]] == ["email_mismatch"]
    assert escalated["total"] == 2
    assert retries["total"] == 2
    assert with_match["total"] == 3


def test_queue_is_read_only_and_submission_is_unchanged() -> None:
    seed_case("email_read_only", BL_MISMATCH_TEXT)
    client = TestClient(main.app)
    cases_before = {
        email_id: case.model_dump(mode="json") for email_id, case in main.cases.items()
    }
    reviews_before = main.human_review_store.list(
        ReviewTargetType.COMPETITION_CASE,
        "email_read_only",
    )
    retries_before = main.retry_execution_store.list(
        ReviewTargetType.COMPETITION_CASE,
        "email_read_only",
    )
    escalations_before = main.escalation_store.list(
        ReviewTargetType.COMPETITION_CASE,
        "email_read_only",
    )
    submission_before = client.get("/api/submission").json()

    response = client.get("/api/review-queue")

    assert response.status_code == 200
    assert {key: value.model_dump(mode="json") for key, value in main.cases.items()} == cases_before
    assert main.human_review_store.list(
        ReviewTargetType.COMPETITION_CASE,
        "email_read_only",
    ) == reviews_before
    assert main.retry_execution_store.list(
        ReviewTargetType.COMPETITION_CASE,
        "email_read_only",
    ) == retries_before
    assert main.escalation_store.list(
        ReviewTargetType.COMPETITION_CASE,
        "email_read_only",
    ) == escalations_before
    assert client.get("/api/submission").json() == submission_before


def test_manual_upload_comparisons_are_not_mixed_into_competition_queue() -> None:
    client = TestClient(main.app)
    uploaded = client.post(
        "/api/compare-upload",
        files=(
            ("si_file", ("si.txt", SI_TEXT, "text/plain")),
            ("bl_file", ("bl.txt", BL_MISMATCH_TEXT, "text/plain")),
        ),
    )

    response = client.get("/api/review-queue")

    assert uploaded.status_code == 200
    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []


def test_competition_baseline_shape_has_130_default_queue_items() -> None:
    for index in range(390):
        seed_case(f"match_{index:03d}", SI_TEXT)
    for index in range(51):
        seed_case(f"mismatch_{index:03d}", BL_MISMATCH_TEXT)
    for index in range(79):
        seed_case(f"review_{index:03d}", BL_MISSING_TEXT)

    response = TestClient(main.app).get(
        "/api/review-queue",
        params={"limit": 100},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 130
    assert len(response.json()["items"]) == 100
