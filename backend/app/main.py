import os
from pathlib import PurePosixPath, PureWindowsPath
from urllib.parse import quote

import httpx
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.clients.inbox import InboxClient
from app.models import CaseRecord, FieldStatus
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
processor = CaseProcessor(inbox)
cases: dict[str, CaseRecord] = {}

ATTACHMENT_MEDIA_TYPES = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
INLINE_ATTACHMENT_TYPES = {".pdf", ".txt"}


def _is_safe_attachment_path(filename: str) -> bool:
    path = PurePosixPath(filename)
    return (
        bool(filename)
        and "\\" not in filename
        and not path.is_absolute()
        and not PureWindowsPath(filename).is_absolute()
        and ".." not in path.parts
        and bool(path.name)
    )


def _content_disposition(filename: str, disposition: str) -> str:
    basename = PurePosixPath(filename).name
    quoted_basename = quote(basename)
    if quoted_basename != basename:
        return f"{disposition}; filename*=utf-8''{quoted_basename}"
    return f'{disposition}; filename="{basename}"'


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


@app.get("/api/cases/{email_id}/attachment")
async def get_case_attachment(email_id: str, filename: str) -> Response:
    case = cases.get(email_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    known_attachments = set(case.email.attachments)
    known_attachments.update(
        attachment
        for attachment in (case.si_attachment, case.bl_attachment)
        if attachment is not None
    )
    if not _is_safe_attachment_path(filename) or filename not in known_attachments:
        raise HTTPException(
            status_code=404,
            detail="Attachment not found for this case.",
        )

    try:
        content = await inbox.get_attachment(filename)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Attachment not found.") from exc
        raise HTTPException(status_code=502, detail="Inbox service unavailable.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Inbox service unavailable.") from exc

    suffix = PurePosixPath(filename).suffix.casefold()
    disposition = "inline" if suffix in INLINE_ATTACHMENT_TYPES else "attachment"
    return Response(
        content=content,
        media_type=ATTACHMENT_MEDIA_TYPES.get(suffix, "application/octet-stream"),
        headers={
            "Content-Disposition": _content_disposition(filename, disposition),
        },
    )


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
