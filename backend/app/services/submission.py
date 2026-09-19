from app.models import (
    CaseStatus,
    EmailCategory,
    ReviewReason,
    SubmissionEntry,
    SubmissionStatus,
)


def build_submission_entry(
    category: EmailCategory,
    status: CaseStatus,
    mismatch_fields: list[str],
    review_reason: ReviewReason | None = None,
) -> SubmissionEntry:
    if status is CaseStatus.MATCH:
        submission_status = SubmissionStatus.OK
    elif status is CaseStatus.MISMATCH:
        submission_status = SubmissionStatus.MISMATCH
    else:
        submission_status = SubmissionStatus.NEEDS_REVIEW
    return SubmissionEntry(
        category=category,
        status=submission_status,
        review_reason=review_reason if submission_status is SubmissionStatus.NEEDS_REVIEW else None,
        has_defect=submission_status is SubmissionStatus.MISMATCH,
        defect_fields=mismatch_fields if submission_status is SubmissionStatus.MISMATCH else [],
    )

