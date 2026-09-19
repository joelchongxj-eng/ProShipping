import httpx
import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.models import CaseRecord, CaseStatus, EmailCategory, EmailRecord


class AttachmentInbox:
    def __init__(
        self,
        attachments: dict[str, bytes] | None = None,
        error: httpx.HTTPError | None = None,
    ) -> None:
        self.attachments = attachments or {}
        self.error = error

    async def get_attachment(self, path: str) -> bytes:
        if self.error is not None:
            raise self.error
        if path not in self.attachments:
            request = httpx.Request("GET", f"http://inbox.test/{path}")
            response = httpx.Response(404, request=request)
            raise httpx.HTTPStatusError("not found", request=request, response=response)
        return self.attachments[path]


@pytest.fixture
def attachment_case() -> CaseRecord:
    filenames = [
        "attachments/email_001_SI.pdf",
        "attachments/email_001_notes.txt",
        "attachments/email_001_form.docx",
        "attachments/email_001_data.xlsx",
    ]
    return CaseRecord(
        email=EmailRecord(
            email_id="email_001",
            **{"from": "shipping@example.com"},
            subject="Please compare SI and BL",
            body="See attachments.",
            attachments=filenames,
        ),
        category=EmailCategory.BL_COMPARISON,
        status=CaseStatus.MATCH,
        si_attachment=filenames[0],
        bl_attachment=filenames[1],
    )


@pytest.fixture(autouse=True)
def clear_processed_cases() -> None:
    main.cases.clear()
    yield
    main.cases.clear()


def test_health_endpoint() -> None:
    response = TestClient(main.app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "proshipping-backend"}


@pytest.mark.parametrize(
    ("filename", "content", "content_type", "disposition"),
    (
        (
            "attachments/email_001_SI.pdf",
            b"%PDF-original-bytes",
            "application/pdf",
            'inline; filename="email_001_SI.pdf"',
        ),
        (
            "attachments/email_001_notes.txt",
            b"original text bytes\r\n",
            "text/plain",
            'inline; filename="email_001_notes.txt"',
        ),
        (
            "attachments/email_001_form.docx",
            b"PK-original-docx-bytes",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            'attachment; filename="email_001_form.docx"',
        ),
        (
            "attachments/email_001_data.xlsx",
            b"PK-original-xlsx-bytes",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            'attachment; filename="email_001_data.xlsx"',
        ),
    ),
)
def test_attachment_endpoint_returns_original_supported_file(
    monkeypatch: pytest.MonkeyPatch,
    attachment_case: CaseRecord,
    filename: str,
    content: bytes,
    content_type: str,
    disposition: str,
) -> None:
    main.cases[attachment_case.email.email_id] = attachment_case
    monkeypatch.setattr(main, "inbox", AttachmentInbox({filename: content}))

    response = TestClient(main.app).get(
        "/api/cases/email_001/attachment",
        params={"filename": filename},
    )

    assert response.status_code == 200
    assert response.content == content
    assert response.headers["content-type"].startswith(content_type)
    assert response.headers["content-disposition"] == disposition


def test_attachment_endpoint_returns_404_for_unknown_case() -> None:
    response = TestClient(main.app).get(
        "/api/cases/unknown/attachment",
        params={"filename": "attachments/email_001_SI.pdf"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Case not found."}


def test_attachment_endpoint_rejects_file_not_owned_by_case(
    monkeypatch: pytest.MonkeyPatch,
    attachment_case: CaseRecord,
) -> None:
    main.cases[attachment_case.email.email_id] = attachment_case
    monkeypatch.setattr(
        main,
        "inbox",
        AttachmentInbox({"attachments/other.pdf": b"not authorized"}),
    )

    response = TestClient(main.app).get(
        "/api/cases/email_001/attachment",
        params={"filename": "attachments/other.pdf"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Attachment not found for this case."}


@pytest.mark.parametrize(
    "filename",
    (
        "../../secret.txt",
        "/etc/passwd",
        "attachments\\..\\secret.txt",
    ),
)
def test_attachment_endpoint_rejects_unsafe_paths(
    attachment_case: CaseRecord,
    filename: str,
) -> None:
    main.cases[attachment_case.email.email_id] = attachment_case

    response = TestClient(main.app).get(
        "/api/cases/email_001/attachment",
        params={"filename": filename},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Attachment not found for this case."}


def test_attachment_endpoint_maps_missing_inbox_attachment_to_404(
    monkeypatch: pytest.MonkeyPatch,
    attachment_case: CaseRecord,
) -> None:
    main.cases[attachment_case.email.email_id] = attachment_case
    monkeypatch.setattr(main, "inbox", AttachmentInbox())

    response = TestClient(main.app).get(
        "/api/cases/email_001/attachment",
        params={"filename": "attachments/email_001_SI.pdf"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Attachment not found."}


def test_attachment_endpoint_maps_inbox_service_failure_to_502(
    monkeypatch: pytest.MonkeyPatch,
    attachment_case: CaseRecord,
) -> None:
    main.cases[attachment_case.email.email_id] = attachment_case
    request = httpx.Request("GET", "http://inbox.test/attachments/email_001_SI.pdf")
    monkeypatch.setattr(
        main,
        "inbox",
        AttachmentInbox(error=httpx.ConnectError("private service details", request=request)),
    )

    response = TestClient(main.app).get(
        "/api/cases/email_001/attachment",
        params={"filename": "attachments/email_001_SI.pdf"},
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "Inbox service unavailable."}
