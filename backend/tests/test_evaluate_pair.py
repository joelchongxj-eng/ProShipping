import json

import httpx
import pytest

from app.evaluate_pair import evaluate_pair
from app.services.ai_service import AIService
from tests.test_processor import groq_reply, pdf_with_text


@pytest.mark.asyncio
async def test_evaluate_pair_reads_files_and_reports_field_mismatch(tmp_path):
    si = tmp_path / "email_001_SI.txt"
    bl = tmp_path / "email_001_BL.txt"
    si.write_text("SHIPPING INSTRUCTION\nContainer Count: 1 x 40HC", encoding="utf-8")
    bl.write_text("BILL OF LADING\nContainer Count: 2 x 40HC", encoding="utf-8")
    replies = iter([
        {"document_type": "SI", "fields": {"container_count": {"raw_value": "1 x 40HC", "evidence": "Container Count: 1 x 40HC"}}},
        {"document_type": "BL", "fields": {"container_count": {"raw_value": "2 x 40HC", "evidence": "Container Count: 2 x 40HC"}}},
    ])

    def handler(request):
        return groq_reply(next(replies))

    service = AIService("test-key", client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    report = await evaluate_pair(si, bl, service)

    assert "SI: SI; BL: BL" in report
    assert "Overall: MISMATCH" in report
    assert "container_count: mismatch (SI=1, BL=2)" in report
    assert "shipper: missing" in report


@pytest.mark.asyncio
async def test_evaluate_pair_does_not_compare_wrong_document_types(tmp_path):
    si = tmp_path / "email_001_SI.txt"
    bl = tmp_path / "email_001_BL.txt"
    si.write_text("SHIPPING INSTRUCTION", encoding="utf-8")
    bl.write_text("INVOICE", encoding="utf-8")
    replies = iter([
        {"document_type": "SI", "fields": {}},
        {"document_type": "OTHER", "fields": {}},
    ])

    def handler(request):
        return groq_reply(next(replies))

    service = AIService("test-key", client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    report = await evaluate_pair(si, bl, service)

    assert "SI: SI; BL: OTHER" in report
    assert "Overall: NEEDS_REVIEW" in report
    assert "container_count:" not in report


@pytest.mark.asyncio
async def test_evaluate_pair_accepts_text_pdf_files(tmp_path):
    si = tmp_path / "email_059_SI.pdf"
    bl = tmp_path / "email_059_BL.pdf"
    si.write_bytes(pdf_with_text("Container Count: 1 x 40HC"))
    bl.write_bytes(pdf_with_text("Container Count: 2 x 40HC"))
    replies = iter([
        {"document_type": "SI", "fields": {"container_count": {"raw_value": "1 x 40HC", "evidence": "Container Count: 1 x 40HC"}}},
        {"document_type": "BL", "fields": {"container_count": {"raw_value": "2 x 40HC", "evidence": "Container Count: 2 x 40HC"}}},
    ])

    def handler(request):
        return groq_reply(next(replies))

    service = AIService("test-key", client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    report = await evaluate_pair(si, bl, service)
    assert "Overall: MISMATCH" in report
    assert "container_count: mismatch (SI=1, BL=2)" in report
