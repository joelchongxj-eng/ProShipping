import copy

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.models import (
    CaseRecord,
    CaseStatus,
    EmailCategory,
    EmailRecord,
    FieldComparison,
    FieldStatus,
    ReviewReason,
)


@pytest.fixture(autouse=True)
def clear_review_state() -> None:
    main.cases.clear()
    main.human_review_store.clear()
    main.escalation_store.clear()
    main.submission_workflow_store.clear()
    yield
    main.cases.clear()
    main.human_review_store.clear()
    main.escalation_store.clear()
    main.submission_workflow_store.clear()


def seed_needs_review(
    email_id: str,
    reason: ReviewReason,
    *,
    comparison: list[FieldComparison] | None = None,
) -> CaseRecord:
    case = CaseRecord(
        email=EmailRecord(
            email_id=email_id,
            **{"from": "shipping@example.com"},
            subject=f"Review {email_id}",
            body="Review the document issue.",
            attachments=[],
        ),
        category=EmailCategory.BL_COMPARISON,
        status=CaseStatus.NEEDS_REVIEW,
        comparison=comparison or [],
        review_reason=reason,
    )
    main.cases[email_id] = case
    return case


def case_action_payload(action: str) -> dict[str, str]:
    if action == "REQUEST_INFORMATION":
        return {
            "scope": "CASE",
            "action": action,
            "request_reason": "Please provide the missing or corrected document.",
        }
    return {
        "scope": "CASE",
        "action": action,
        "escalation_reason": "The case cannot be resolved from the available documents.",
        "reviewer_action": "Checked the available email and attachments.",
        "requested_decision": "Confirm the next action for this case.",
    }


@pytest.mark.parametrize("reason", (ReviewReason.MISSING_ATTACHMENT, ReviewReason.WRONG_DOC_TYPE))
@pytest.mark.parametrize("action", ("REQUEST_INFORMATION", "ESCALATE"))
def test_case_scoped_action_queues_case_level_issue_without_mutating_automated_result(
    reason: ReviewReason,
    action: str,
) -> None:
    email_id = f"email_{reason.value}_{action.lower()}"
    case = seed_needs_review(email_id, reason)
    automated_before = copy.deepcopy(case.model_dump(mode="json"))
    client = TestClient(main.app)
    submission_before = client.get("/api/submission").json()

    response = client.post(
        f"/api/cases/{email_id}/reviews",
        json=case_action_payload(action),
    )

    assert response.status_code == 201
    assert response.json()["scope"] == "CASE"
    assert response.json()["field"] is None
    assert response.json()["side"] is None
    history = client.get(f"/api/cases/{email_id}/reviews").json()["reviews"]
    assert len(history) == 1
    assert history[0]["action"] == action
    assert main.cases[email_id].model_dump(mode="json") == automated_before
    assert client.get("/api/submission").json() == submission_before

    workflow = client.get("/api/submission-workflow").json()
    section = workflow["sender_follow_up" if action == "REQUEST_INFORMATION" else "supervisor"]
    assert len(section["items"]) == 1
    assert section["items"][0]["field"] is None

    if action == "ESCALATE":
        assignments = client.get(f"/api/cases/{email_id}/escalations").json()["assignments"]
        assert len(assignments) == 1
        assert assignments[0]["field"] is None


def test_case_scoped_actions_remain_append_only() -> None:
    email_id = "email_case_history"
    seed_needs_review(email_id, ReviewReason.MISSING_ATTACHMENT)
    client = TestClient(main.app)

    first = client.post(
        f"/api/cases/{email_id}/reviews",
        json=case_action_payload("REQUEST_INFORMATION"),
    )
    second = client.post(
        f"/api/cases/{email_id}/reviews",
        json={"scope": "CASE", "action": "ADD_NOTE", "note": "Sender contacted."},
    )

    assert first.status_code == 201
    assert second.status_code == 201
    history = client.get(f"/api/cases/{email_id}/reviews").json()["reviews"]
    assert [record["sequence"] for record in history] == [1, 2]
    assert [record["action"] for record in history] == ["REQUEST_INFORMATION", "ADD_NOTE"]


@pytest.mark.parametrize("action", ("REQUEST_INFORMATION", "ESCALATE"))
def test_case_scoped_action_is_rejected_for_mismatch(action: str) -> None:
    email_id = f"email_mismatch_{action.lower()}"
    case = seed_needs_review(email_id, ReviewReason.MISSING_VALUE)
    main.cases[email_id] = case.model_copy(update={"status": CaseStatus.MISMATCH})

    response = TestClient(main.app).post(
        f"/api/cases/{email_id}/reviews",
        json=case_action_payload(action),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == f"{action} requires field scope."


@pytest.mark.parametrize("action", ("REQUEST_INFORMATION", "ESCALATE"))
def test_case_scoped_action_is_rejected_when_a_comparison_field_is_available(action: str) -> None:
    email_id = f"email_field_available_{action.lower()}"
    seed_needs_review(
        email_id,
        ReviewReason.MISSING_VALUE,
        comparison=[
            FieldComparison(
                field="shipper",
                status=FieldStatus.MISSING,
                si=None,
                bl=None,
                reason="Shipper is missing.",
            )
        ],
    )

    response = TestClient(main.app).post(
        f"/api/cases/{email_id}/reviews",
        json=case_action_payload(action),
    )

    assert response.status_code == 422
    assert "comparison field" in response.json()["detail"].casefold()
