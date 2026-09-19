"""Evaluate a small, explicitly selected group of local competition emails."""

import argparse
import asyncio
import json
import re
from pathlib import Path

from app.models import CaseStatus, EmailRecord, FieldStatus
from app.services.ai_service import AIService
from app.services.processor import CaseProcessor


class LocalInbox:
    def __init__(self, bundle: Path, ids: list[str]):
        self.bundle = bundle.resolve()
        self.ids = []
        for item in ids:
            if not re.fullmatch(r"(?:email_)?\d{3}", item):
                raise ValueError(f"Invalid email ID: {item}")
            self.ids.append(item if item.startswith("email_") else f"email_{item}")

    async def list_emails(self) -> list[EmailRecord]:
        return [EmailRecord.model_validate_json((self.bundle / "inbox" / f"{item}.json").read_text(encoding="utf-8"))
                for item in self.ids]

    async def get_attachment(self, path: str) -> bytes:
        source = (self.bundle / path).resolve()
        if not source.is_relative_to(self.bundle):
            raise ValueError("Attachment path is outside the bundle")
        return source.read_bytes()


async def run_batch(bundle: Path, ids: list[str], service: AIService | None) -> dict:
    cases = await CaseProcessor(LocalInbox(bundle, ids), concurrency=1, ai_service=service).process_all()
    counts: dict[str, int] = {}
    for case in cases:
        counts[case.status.value] = counts.get(case.status.value, 0) + 1
    return {
        "processed": len(cases),
        "status_counts": counts,
        "cases": [{
            "email_id": case.email.email_id,
            "category": case.category.value,
            "status": case.status.value,
            "review_reason": case.review_reason.value if case.status is CaseStatus.NEEDS_REVIEW and case.review_reason else None,
            "mismatch_fields": [item.field for item in case.comparison if item.status is FieldStatus.MISMATCH],
            "review_fields": [item.field for item in case.comparison if item.status in {FieldStatus.MISSING, FieldStatus.NEEDS_REVIEW}],
        } for case in cases],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Groq AI on selected local competition emails")
    parser.add_argument("bundle", type=Path, help="Path to sdoc-hackathon-bundle")
    parser.add_argument("ids", nargs="+", help="Three-digit email IDs, such as 001 091")
    args = parser.parse_args()
    print(json.dumps(asyncio.run(run_batch(args.bundle, args.ids, AIService())), indent=2))


if __name__ == "__main__":
    main()
