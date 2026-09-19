import os

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.clients.inbox import InboxClient
from app.models import CaseRecord, FieldStatus
from app.services.ai_service import AIService
from app.services.processor import CaseProcessor
from app.services.submission import build_submission_entry


app = FastAPI(title="ProShipping API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

inbox = InboxClient(os.getenv("INBOX_BASE_URL", "http://localhost:8080"))
processor = CaseProcessor(inbox, ai_service=AIService() if os.getenv("AI_ENABLED") == "1" else None)
cases: dict[str, CaseRecord] = {}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "proshipping-backend"}


@app.post("/api/process-all")
async def process_all() -> dict[str, object]:
    try:
        processed = await processor.process_all()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Inbox service unavailable: {exc}") from exc
    cases.clear()
    cases.update({case.email.email_id: case for case in processed})
    counts: dict[str, int] = {}
    for case in processed:
        counts[case.status.value] = counts.get(case.status.value, 0) + 1
    return {"processed": len(processed), "status_counts": counts}


@app.get("/api/cases", response_model=list[CaseRecord])
async def list_cases(status: str | None = None) -> list[CaseRecord]:
    result = list(cases.values())
    if status:
        result = [case for case in result if case.status.value == status.upper()]
    return result


@app.get("/api/cases/{email_id}", response_model=CaseRecord)
async def get_case(email_id: str) -> CaseRecord:
    if email_id not in cases:
        raise HTTPException(status_code=404, detail="Case not found. Run /api/process-all first.")
    return cases[email_id]


@app.get("/api/submission")
async def get_submission() -> dict[str, dict[str, object]]:
    submission: dict[str, dict[str, object]] = {}
    for email_id, case in cases.items():
        mismatch_fields = [
            item.field for item in case.comparison if item.status is FieldStatus.MISMATCH
        ]
        entry = build_submission_entry(
            category=case.category,
            status=case.status,
            mismatch_fields=mismatch_fields,
            review_reason=case.review_reason,
        )
        submission[email_id] = entry.model_dump(mode="json")
    return submission

