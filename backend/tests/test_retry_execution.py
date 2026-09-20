from collections.abc import Mapping
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.models import (
    CaseRecord,
    CaseStatus,
    EmailCategory,
    EmailRecord,
    ReviewReason,
)
from app.reviews.models import ReviewTargetType
from app.reviews.retry import RetryExecutionStatus, RetryExecutionStore
from app.services.document_pair import compare_document_pair
from tests.test_document_text import image_pdf


MATCH_TEXT = b"""Shipper: ACME EXPORT LTD
Consignee: ACME IMPORT LTD
Notify Party: ACME NOTIFY LTD
Port of Loading: PORT KLANG
Port of Discharge: CALLAO
Container Count: 3
Gross Weight (KG): 21,577 KG
"""
MISMATCH_TEXT = MATCH_TEXT.replace(b"21,577 KG", b"20,000 KG")


class AttachmentInbox:
    def __init__(self, attachments: Mapping[str, bytes]) -> None:
        self.attachments = dict(attachments)

    async def get_attachment(self, path: str) -> bytes:
        return self.attachments[path]


class VisionTranscriptAI:
    def __init__(self, transcript: str) -> None:
        self.transcript = transcript
        self.vision_calls = 0

    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        self.vision_calls += 1
        return self.transcript

    async def extract_text(self, text: str, filename: str):
        pytest.fail("Complete transcript must not require structured extraction.")


def seed_case(
    email_id: str,
    si_content: bytes,
    bl_content: bytes,
    *,
    extension: str = "txt",
) -> tuple[CaseRecord, dict[str, bytes]]:
    si_path = f"attachments/{email_id}_SI.{extension}"
    bl_path = f"attachments/{email_id}_BL.{extension}"
    result = compare_document_pair(
        si_path,
        si_content,
        bl_path,
        bl_content,
    )
    case = CaseRecord(
        email=EmailRecord(
            email_id=email_id,
            **{"from": "shipping@example.com"},
            subject="Compare SI and BL",
            body="Please compare the attached SI and draft BL.",
            attachments=[si_path, bl_path],
        ),
        category=EmailCategory.BL_COMPARISON,
        status=result.status,
        si_attachment=si_path,
        bl_attachment=bl_path,
        si_fields=result.si_fields,
        bl_fields=result.bl_fields,
        comparison=result.comparison,
        review_reason=result.review_reason,
    )
    main.cases[email_id] = case
    return case, {si_path: si_content, bl_path: bl_content}


@pytest.fixture(autouse=True)
def clear_retry_state(monkeypatch: pytest.MonkeyPatch) -> None:
    original_inbox = main.processor.inbox
    original_ai = main.processor.ai_service
    main.cases.clear()
    main.human_review_store.clear()
    main.upload_store.clear()
    retry_store = getattr(main, "retry_execution_store", None)
    if retry_store is not None:
        retry_store.clear()
    retry_service = getattr(main, "retry_execution_service", None)
    if retry_service is not None:
        retry_service.clear_registered_uploads()
    yield
    main.processor.inbox = original_inbox
    main.processor.ai_service = original_ai
    main.cases.clear()
    main.human_review_store.clear()
    main.upload_store.clear()
    if retry_store is not None:
        retry_store.clear()
    if retry_service is not None:
        retry_service.clear_registered_uploads()


def test_competition_retry_records_review_and_separate_successful_attempt() -> None:
    case, attachments = seed_case("email_retry_success", MATCH_TEXT, MISMATCH_TEXT)
    main.processor.inbox = AttachmentInbox(attachments)
    original = case.model_dump(mode="json")
    client = TestClient(main.app)
    submission_before = client.get("/api/submission").json()

    response = client.post(
        "/api/cases/email_retry_success/reviews",
        json={"scope": "CASE", "action": "RETRY"},
    )
    attempts = client.get(
        "/api/cases/email_retry_success/retry-attempts"
    )

    assert response.status_code == 201
    review = response.json()
    assert review["action"] == "RETRY"
    assert review["review_status"] == "RETRY_REQUESTED"
    assert attempts.status_code == 200
    attempt = attempts.json()["attempts"][0]
    assert attempt["attempt_number"] == 1
    assert attempt["requested_review_id"] == review["review_id"]
    assert attempt["execution_status"] == "SUCCEEDED"
    assert attempt["previous_automated_status"] == "MISMATCH"
    assert attempt["new_automated_status"] == "MISMATCH"
    assert attempt["previous_result_hash"] == review["automated_result_hash"]
    assert attempt["new_result_hash"] is not None
    assert attempt["error_reason"] is None
    assert attempt["new_automated_result"]["status"] == "MISMATCH"
    assert len(attempt["new_automated_result"]["comparison"]) == 7
    assert main.cases["email_retry_success"].model_dump(mode="json") == original
    assert client.get("/api/submission").json() == submission_before


def test_retry_attempt_numbers_increment_and_history_is_ordered() -> None:
    _, attachments = seed_case("email_retry_twice", MATCH_TEXT, MISMATCH_TEXT)
    main.processor.inbox = AttachmentInbox(attachments)
    client = TestClient(main.app)

    for _ in range(2):
        response = client.post(
            "/api/cases/email_retry_twice/reviews",
            json={"scope": "CASE", "action": "RETRY"},
        )
        assert response.status_code == 201

    attempts = client.get(
        "/api/cases/email_retry_twice/retry-attempts"
    ).json()["attempts"]

    assert [attempt["attempt_number"] for attempt in attempts] == [1, 2]
    assert len({attempt["retry_id"] for attempt in attempts}) == 2
    assert [attempt["execution_status"] for attempt in attempts] == [
        "SUCCEEDED",
        "SUCCEEDED",
    ]


def test_retry_execution_transitions_are_true_append_only_snapshots() -> None:
    store = RetryExecutionStore()
    pending = store.create_pending(
        target_type=ReviewTargetType.COMPETITION_CASE,
        target_id="email_append_only",
        requested_review_id=uuid4(),
        previous_automated_status=CaseStatus.NEEDS_REVIEW,
        previous_result_hash="previous-hash",
    )
    started_at = datetime.now(UTC)
    running = store.transition(
        pending.retry_id,
        execution_status=RetryExecutionStatus.RUNNING,
        started_at=started_at,
    )
    failed = store.transition(
        pending.retry_id,
        execution_status=RetryExecutionStatus.FAILED,
        started_at=started_at,
        completed_at=datetime.now(UTC),
        error_reason="Safe retry failure.",
    )

    events = store._events[(ReviewTargetType.COMPETITION_CASE, "email_append_only")]
    assert [event.execution_status for event in events] == [
        RetryExecutionStatus.PENDING,
        RetryExecutionStatus.RUNNING,
        RetryExecutionStatus.FAILED,
    ]
    assert pending.execution_status is RetryExecutionStatus.PENDING
    assert running.execution_status is RetryExecutionStatus.RUNNING
    assert failed.execution_status is RetryExecutionStatus.FAILED
    assert store.list(ReviewTargetType.COMPETITION_CASE, "email_append_only") == [
        failed
    ]


def test_retry_review_is_appended_before_execution(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _, attachments = seed_case("email_retry_order", MATCH_TEXT, MISMATCH_TEXT)
    main.processor.inbox = AttachmentInbox(attachments)
    observed: list[str] = []

    async def observe(review):
        stored = main.human_review_store.list(review.target_type, review.target_id)
        assert stored[-1].review_id == review.review_id
        observed.append(str(review.review_id))

    monkeypatch.setattr(main.retry_execution_service, "execute", observe)

    response = TestClient(main.app).post(
        "/api/cases/email_retry_order/reviews",
        json={"scope": "CASE", "action": "RETRY"},
    )

    assert response.status_code == 201
    assert observed == [response.json()["review_id"]]


def test_ai_disabled_scanned_pdf_retry_is_a_safe_failure() -> None:
    scan = image_pdf()
    case, attachments = seed_case(
        "email_retry_scan_disabled",
        scan,
        scan,
        extension="pdf",
    )
    assert case.review_reason is ReviewReason.UNREADABLE
    main.processor.inbox = AttachmentInbox(attachments)
    main.processor.ai_service = None
    original = case.model_dump(mode="json")
    client = TestClient(main.app)

    response = client.post(
        "/api/cases/email_retry_scan_disabled/reviews",
        json={"scope": "CASE", "action": "RETRY"},
    )
    attempt = client.get(
        "/api/cases/email_retry_scan_disabled/retry-attempts"
    ).json()["attempts"][0]

    assert response.status_code == 201
    assert attempt["execution_status"] == "FAILED"
    assert attempt["new_automated_status"] == "NEEDS_REVIEW"
    assert attempt["new_automated_result"]["review_reason"] == "unreadable"
    assert attempt["error_reason"] == "Retry could not read the source documents."
    assert main.cases["email_retry_scan_disabled"].model_dump(mode="json") == original


def test_mocked_ai_enabled_scanned_pdf_retry_succeeds() -> None:
    scan = image_pdf()
    case, attachments = seed_case(
        "email_retry_scan_enabled",
        scan,
        scan,
        extension="pdf",
    )
    main.processor.inbox = AttachmentInbox(attachments)
    ai = VisionTranscriptAI(MATCH_TEXT.decode())
    main.processor.ai_service = ai
    original = case.model_dump(mode="json")
    client = TestClient(main.app)

    response = client.post(
        "/api/cases/email_retry_scan_enabled/reviews",
        json={"scope": "CASE", "action": "RETRY"},
    )
    attempt = client.get(
        "/api/cases/email_retry_scan_enabled/retry-attempts"
    ).json()["attempts"][0]

    assert response.status_code == 201
    assert ai.vision_calls == 2
    assert attempt["execution_status"] == "SUCCEEDED"
    assert attempt["previous_automated_status"] == "NEEDS_REVIEW"
    assert attempt["new_automated_status"] == "MATCH"
    assert len(attempt["new_automated_result"]["comparison"]) == 7
    assert main.cases["email_retry_scan_enabled"].model_dump(mode="json") == original


def test_manual_upload_retry_stores_result_without_overwriting_original() -> None:
    client = TestClient(main.app)
    uploaded = client.post(
        "/api/compare-upload",
        files=(
            ("si_file", ("si.txt", MATCH_TEXT, "text/plain")),
            ("bl_file", ("bl.txt", MISMATCH_TEXT, "text/plain")),
        ),
    ).json()
    comparison_id = uploaded["comparison_id"]

    response = client.post(
        f"/api/upload-comparisons/{comparison_id}/reviews",
        json={"scope": "CASE", "action": "RETRY"},
    )
    attempts = client.get(
        f"/api/upload-comparisons/{comparison_id}/retry-attempts"
    )

    assert response.status_code == 201
    assert response.json()["review_status"] == "RETRY_REQUESTED"
    assert attempts.status_code == 200
    attempt = attempts.json()["attempts"][0]
    assert attempt["target_type"] == "UPLOAD_COMPARISON"
    assert attempt["execution_status"] == "SUCCEEDED"
    assert attempt["new_automated_result"]["status"] == "MISMATCH"
    assert client.get(f"/api/upload-comparisons/{comparison_id}").json() == uploaded
    summary = client.get(
        f"/api/upload-comparisons/{comparison_id}/review-summary"
    ).json()
    assert summary["automated_status"] == "MISMATCH"
    assert summary["review_status"] == "RETRY_REQUESTED"


def test_expired_manual_upload_retry_creates_safe_failed_attempt(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = TestClient(main.app)
    uploaded = client.post(
        "/api/compare-upload",
        files=(
            ("si_file", ("si.txt", MATCH_TEXT, "text/plain")),
            ("bl_file", ("bl.txt", MISMATCH_TEXT, "text/plain")),
        ),
    ).json()
    comparison_id = uploaded["comparison_id"]
    monkeypatch.setattr(main.upload_store, "ttl_seconds", 0)
    session = main.upload_store._sessions[comparison_id]
    main.upload_store._sessions[comparison_id] = session.__class__(
        response=session.response,
        attachments=session.attachments,
        directory=session.directory,
        expires_at=0,
    )

    response = client.post(
        f"/api/upload-comparisons/{comparison_id}/reviews",
        json={"scope": "CASE", "action": "RETRY"},
    )
    attempts = client.get(
        f"/api/upload-comparisons/{comparison_id}/retry-attempts"
    )

    assert response.status_code == 201
    assert response.json()["review_status"] == "RETRY_REQUESTED"
    assert attempts.status_code == 200
    attempt = attempts.json()["attempts"][0]
    assert attempt["execution_status"] == "FAILED"
    assert attempt["new_automated_status"] is None
    assert attempt["new_automated_result"] is None
    assert attempt["error_reason"] == "Uploaded source documents are no longer available."
    reviews = client.get(
        f"/api/upload-comparisons/{comparison_id}/reviews"
    )
    summary = client.get(
        f"/api/upload-comparisons/{comparison_id}/review-summary"
    )
    assert reviews.status_code == 200
    assert reviews.json()["reviews"][-1]["review_status"] == "RETRY_REQUESTED"
    assert summary.status_code == 200
    assert summary.json()["automated_status"] == "MISMATCH"
    assert summary.json()["review_status"] == "RETRY_REQUESTED"


def test_retry_on_match_remains_rejected_and_creates_no_attempt() -> None:
    seed_case("email_retry_match", MATCH_TEXT, MATCH_TEXT)
    client = TestClient(main.app)

    response = client.post(
        "/api/cases/email_retry_match/reviews",
        json={"scope": "CASE", "action": "RETRY"},
    )
    attempts = client.get(
        "/api/cases/email_retry_match/retry-attempts"
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "RETRY is only valid for MISMATCH or NEEDS_REVIEW."
    }
    assert attempts.status_code == 200
    assert attempts.json()["attempts"] == []
