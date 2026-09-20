import os
from pathlib import PurePosixPath, PureWindowsPath
from typing import Annotated
from urllib.parse import quote, unquote
from uuid import uuid4

import httpx
from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.clients.inbox import InboxClient
from app.models import (
    CaseRecord,
    FieldStatus,
    UploadComparisonResponse,
    UploadedFileReference,
)
from app.reviews.router import create_review_router
from app.reviews.retry import RetryExecutionStore
from app.reviews.retry_service import RetryExecutionService
from app.reviews.service import HumanReviewService
from app.reviews.store import HumanReviewStore
from app.services.ai_service import AIService
from app.services.document_pair import compare_document_pair_with_ai_fallback
from app.services.processor import CaseProcessor
from app.services.submission import build_submission_entry
from app.services.upload_store import UploadComparisonStore


app = FastAPI(title="ProShipping API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

inbox = InboxClient(os.getenv("INBOX_BASE_URL", "http://localhost:8080"))
ai_service = AIService() if os.getenv("AI_ENABLED", "0") == "1" else None
processor = CaseProcessor(inbox, ai_service=ai_service)
cases: dict[str, CaseRecord] = {}
upload_store = UploadComparisonStore(
    ttl_seconds=int(os.getenv("UPLOAD_TTL_SECONDS", "3600")),
    max_upload_bytes=int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))),
)
human_review_store = HumanReviewStore()
retry_execution_store = RetryExecutionStore()
retry_execution_service = RetryExecutionService(
    retry_execution_store,
    processor=processor,
    case_lookup=lambda email_id: cases.get(email_id),
    upload_session_lookup=upload_store.get,
    ai_service_lookup=lambda: ai_service,
)
human_review_service = HumanReviewService(
    human_review_store,
    case_lookup=lambda email_id: cases.get(email_id),
    upload_lookup=lambda comparison_id: (
        session.response
        if (session := upload_store.get(comparison_id)) is not None
        else None
    ),
    retry_upload_lookup=retry_execution_service.registered_upload,
)
app.include_router(
    create_review_router(human_review_service, retry_execution_service)
)
app.router.add_event_handler("shutdown", upload_store.close)
app.router.add_event_handler("shutdown", human_review_store.clear)
app.router.add_event_handler("shutdown", retry_execution_store.clear)
app.router.add_event_handler(
    "shutdown",
    retry_execution_service.clear_registered_uploads,
)

ATTACHMENT_MEDIA_TYPES = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
INLINE_ATTACHMENT_TYPES = {".pdf", ".txt"}
UPLOAD_CHUNK_BYTES = 1024 * 1024


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


def _safe_upload_name(filename: str | None, role: str) -> tuple[str, str]:
    candidate = unquote(filename or "").replace("\\", "/")
    basename = PurePosixPath(candidate).name
    basename = "".join(
        character
        if character not in {'"', "\r", "\n"} and ord(character) >= 32
        else "_"
        for character in basename
    )
    extension = PurePosixPath(basename).suffix.casefold()
    if extension not in ATTACHMENT_MEDIA_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported {role.upper()} file type.",
        )
    if not basename or basename in {".", ".."}:
        basename = f"{role}{extension}"
    return basename, extension


async def _read_upload(upload: UploadFile, role: str) -> tuple[str, str, bytes]:
    filename, extension = _safe_upload_name(upload.filename, role)
    chunks: list[bytes] = []
    total = 0
    try:
        while chunk := await upload.read(UPLOAD_CHUNK_BYTES):
            total += len(chunk)
            if total > upload_store.max_upload_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"{role.upper()} file exceeds the upload size limit.",
                )
            chunks.append(chunk)
    finally:
        await upload.close()
    content = b"".join(chunks)
    if not content:
        raise HTTPException(
            status_code=400,
            detail=f"{role.upper()} file is empty.",
        )
    return filename, extension, content


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "proshipping-backend"}


@app.post("/api/compare-upload", response_model=UploadComparisonResponse)
async def compare_upload(
    si_file: Annotated[UploadFile, File()],
    bl_file: Annotated[UploadFile, File()],
) -> UploadComparisonResponse:
    si_filename, si_extension, si_content = await _read_upload(si_file, "si")
    bl_filename, bl_extension, bl_content = await _read_upload(bl_file, "bl")
    comparison_id = str(uuid4())
    si_source_filename = f"uploads/{comparison_id}/si/{si_filename}"
    bl_source_filename = f"uploads/{comparison_id}/bl/{bl_filename}"
    result = await compare_document_pair_with_ai_fallback(
        si_source_filename,
        si_content,
        bl_source_filename,
        bl_content,
        ai_service,
    )
    si_attachment_url = (
        f"/api/upload-comparisons/{comparison_id}/attachments/si"
    )
    bl_attachment_url = (
        f"/api/upload-comparisons/{comparison_id}/attachments/bl"
    )
    response = UploadComparisonResponse(
        comparison_id=comparison_id,
        status=result.status,
        review_reason=result.review_reason,
        si_file=UploadedFileReference(
            filename=si_filename,
            source_filename=si_source_filename,
            attachment_url=si_attachment_url,
        ),
        bl_file=UploadedFileReference(
            filename=bl_filename,
            source_filename=bl_source_filename,
            attachment_url=bl_attachment_url,
        ),
        si_fields=result.si_fields,
        bl_fields=result.bl_fields,
        comparison=result.comparison,
    )
    upload_store.put(
        comparison_id,
        response,
        si_filename=si_filename,
        si_extension=si_extension,
        si_content=si_content,
        bl_filename=bl_filename,
        bl_extension=bl_extension,
        bl_content=bl_content,
    )
    retry_execution_service.register_upload(response)
    return response


@app.get(
    "/api/upload-comparisons/{comparison_id}",
    response_model=UploadComparisonResponse,
)
async def get_upload_comparison(comparison_id: str) -> UploadComparisonResponse:
    session = upload_store.get(comparison_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Upload comparison not found.")
    return session.response


@app.get("/api/upload-comparisons/{comparison_id}/attachments/{role}")
async def get_upload_attachment(
    comparison_id: str,
    role: str,
) -> Response:
    session = upload_store.get(comparison_id)
    if session is None or role not in {"si", "bl"}:
        raise HTTPException(status_code=404, detail="Uploaded attachment not found.")
    stored = session.attachments.get(role)
    if stored is None:
        raise HTTPException(status_code=404, detail="Uploaded attachment not found.")
    try:
        content = stored.path.read_bytes()
    except OSError as exc:
        raise HTTPException(
            status_code=404,
            detail="Uploaded attachment not found.",
        ) from exc
    suffix = PurePosixPath(stored.filename).suffix.casefold()
    disposition = "inline" if suffix in INLINE_ATTACHMENT_TYPES else "attachment"
    return Response(
        content=content,
        media_type=ATTACHMENT_MEDIA_TYPES.get(suffix, "application/octet-stream"),
        headers={
            "Content-Disposition": _content_disposition(
                stored.filename,
                disposition,
            ),
        },
    )


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
