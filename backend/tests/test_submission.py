from app.models import CaseStatus, EmailCategory
from app.services.submission import build_submission_entry


def test_ui_match_maps_to_competition_ok() -> None:
    entry = build_submission_entry(
        category=EmailCategory.BL_COMPARISON,
        status=CaseStatus.MATCH,
        mismatch_fields=[],
    )

    assert entry.model_dump() == {
        "category": "BL_COMPARISON",
        "status": "OK",
        "review_reason": None,
        "has_defect": False,
        "defect_fields": [],
    }

