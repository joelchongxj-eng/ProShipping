import hashlib
import json
import os
from collections import Counter

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.clients.inbox import InboxClient
from app.models import CaseStatus, EmailCategory, ReviewReason
from app.services.processor import CaseProcessor
from tests.test_document_text import image_pdf
from tests.test_extractor import SI_TEXT
from tests.test_processor import AttachmentInbox


class ForbiddenAI:
    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        raise AssertionError("Bulk competition processing must not invoke Vision.")

    async def extract_text(self, text: str, filename: str):
        raise AssertionError("Bulk competition processing must not invoke AI extraction.")


class ForbiddenSemanticAI:
    async def compare_semantic(self, field: str, si_value: str, bl_value: str):
        raise AssertionError("Bulk competition processing must not invoke semantic AI.")


class RecordingVisionAI:
    def __init__(self) -> None:
        self.vision_calls = 0

    async def transcribe_image(self, image: bytes, mime_type: str) -> str:
        self.vision_calls += 1
        return SI_TEXT

    async def extract_text(self, text: str, filename: str):
        raise AssertionError("Complete Vision text must use deterministic extraction first.")


@pytest.fixture(autouse=True)
def clear_processed_cases() -> None:
    main.cases.clear()
    yield
    main.cases.clear()


def test_process_all_endpoint_disables_ai_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    inbox = AttachmentInbox(
        {
            "attachments/email_scan_SI.pdf": image_pdf(),
            "attachments/email_scan_BL.pdf": image_pdf(),
        }
    )
    monkeypatch.setattr(
        main,
        "processor",
        CaseProcessor(
            inbox,
            ai_service=ForbiddenAI(),
            semantic_ai_service=ForbiddenSemanticAI(),
        ),
    )

    response = TestClient(main.app).post("/api/process-all")

    assert response.status_code == 200
    assert response.json() == {
        "processed": 1,
        "status_counts": {"NEEDS_REVIEW": 1},
    }
    case = main.cases[inbox.email.email_id]
    assert case.status is CaseStatus.NEEDS_REVIEW
    assert case.review_reason is ReviewReason.UNREADABLE


async def test_explicit_manual_processing_keeps_vision_fallback() -> None:
    inbox = AttachmentInbox(
        {
            "attachments/email_scan_SI.pdf": image_pdf(),
            "attachments/email_scan_BL.pdf": image_pdf(),
        }
    )
    ai = RecordingVisionAI()

    case = await CaseProcessor(inbox, ai_service=ai).process_email(
        inbox.email,
        allow_ai_fallback=True,
    )

    assert ai.vision_calls == 2
    assert case.status is CaseStatus.MATCH
    assert case.si_fields is not None
    assert case.si_fields.shipper is not None


COMPETITION_INBOX_BASE_URL = os.getenv("COMPETITION_INBOX_BASE_URL")


@pytest.mark.skipif(
    not COMPETITION_INBOX_BASE_URL,
    reason="Set COMPETITION_INBOX_BASE_URL to run the participant-data regression.",
)
async def test_competition_bulk_snapshot_remains_deterministic() -> None:
    inbox = InboxClient(COMPETITION_INBOX_BASE_URL or "")
    try:
        processed = await CaseProcessor(
            inbox,
            ai_service=ForbiddenAI(),
            semantic_ai_service=ForbiddenSemanticAI(),
        ).process_all(allow_ai_fallback=False)
    finally:
        await inbox.close()

    bl_cases = [
        case for case in processed if case.category is EmailCategory.BL_COMPARISON
    ]
    assert len(processed) == 520
    assert len(bl_cases) == 193
    assert Counter(case.status for case in bl_cases) == {
        CaseStatus.MATCH: 63,
        CaseStatus.MISMATCH: 51,
        CaseStatus.NEEDS_REVIEW: 79,
    }

    main.cases.update({case.email.email_id: case for case in processed})
    submission = TestClient(main.app).get("/api/submission")

    assert submission.status_code == 200
    assert len(submission.json()) == 520
    canonical_submission = json.dumps(
        submission.json(),
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    assert hashlib.sha256(canonical_submission).hexdigest() == (
        "8e54e3fd15a5cd0b7eb9a98e32a508d0d86515ded1f9162bd2ce37f96f01f532"
    )
