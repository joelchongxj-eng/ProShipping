import json

import pytest

from app.evaluate_batch import run_batch


@pytest.mark.asyncio
async def test_batch_reports_only_requested_cases_and_review_reasons(tmp_path):
    inbox = tmp_path / "inbox"
    attachments = tmp_path / "attachments"
    inbox.mkdir()
    attachments.mkdir()
    for number, paths in (("001", ["attachments/email_001_SI.txt", "attachments/email_001_BL.txt"]),
                          ("002", ["attachments/email_002_SI.txt"])):
        (inbox / f"email_{number}.json").write_text(json.dumps({
            "email_id": f"email_{number}",
            "from": "shipping@example.com",
            "subject": "Please compare SI and BL",
            "body": "Check attached documents",
            "attachments": paths,
        }), encoding="utf-8")
    (attachments / "email_001_SI.txt").write_text("Shipper: ACME\nContainer Count: 1", encoding="utf-8")
    (attachments / "email_001_BL.txt").write_text("Shipper: ACME\nContainer Count: 2", encoding="utf-8")
    (attachments / "email_002_SI.txt").write_text("Shipper: ACME", encoding="utf-8")

    report = await run_batch(tmp_path, ["001", "email_002"], service=None)

    assert report["processed"] == 2
    assert report["status_counts"] == {"MISMATCH": 1, "NEEDS_REVIEW": 1}
    assert [case["email_id"] for case in report["cases"]] == ["email_001", "email_002"]
    assert report["cases"][1]["review_reason"] == "missing_attachment"
    assert report["cases"][0]["review_reason"] is None
    assert report["cases"][0]["mismatch_fields"] == ["container_count"]
    assert "consignee" in report["cases"][0]["review_fields"]


@pytest.mark.asyncio
async def test_batch_rejects_invalid_id_without_reading_outside_bundle(tmp_path):
    with pytest.raises(ValueError, match="email ID"):
        await run_batch(tmp_path, ["../secret"], service=None)
