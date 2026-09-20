import shutil
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

from app.models import UploadComparisonResponse


@dataclass(frozen=True)
class StoredUpload:
    filename: str
    path: Path


@dataclass(frozen=True)
class UploadSession:
    response: UploadComparisonResponse
    attachments: dict[str, StoredUpload]
    directory: Path
    expires_at: float


class UploadComparisonStore:
    def __init__(
        self,
        *,
        ttl_seconds: int = 3600,
        max_upload_bytes: int = 10 * 1024 * 1024,
        root: Path | None = None,
    ) -> None:
        self.ttl_seconds = ttl_seconds
        self.max_upload_bytes = max_upload_bytes
        self.root = root or Path(tempfile.mkdtemp(prefix="proshipping-uploads-"))
        self.root.mkdir(parents=True, exist_ok=True)
        self._sessions: dict[str, UploadSession] = {}

    def put(
        self,
        comparison_id: str,
        response: UploadComparisonResponse,
        *,
        si_filename: str,
        si_extension: str,
        si_content: bytes,
        bl_filename: str,
        bl_extension: str,
        bl_content: bytes,
    ) -> None:
        self.prune_expired()
        self.root.mkdir(parents=True, exist_ok=True)
        directory = self.root / comparison_id
        directory.mkdir(exist_ok=False)
        attachments: dict[str, StoredUpload] = {}
        try:
            for role, filename, extension, content in (
                ("si", si_filename, si_extension, si_content),
                ("bl", bl_filename, bl_extension, bl_content),
            ):
                path = directory / f"{role}{extension}"
                with path.open("xb") as file:
                    file.write(content)
                attachments[role] = StoredUpload(filename=filename, path=path)
        except Exception:
            shutil.rmtree(directory, ignore_errors=True)
            raise
        self._sessions[comparison_id] = UploadSession(
            response=response,
            attachments=attachments,
            directory=directory,
            expires_at=time.monotonic() + self.ttl_seconds,
        )

    def get(self, comparison_id: str) -> UploadSession | None:
        self.prune_expired()
        return self._sessions.get(comparison_id)

    def prune_expired(self) -> None:
        now = time.monotonic()
        expired = [
            comparison_id
            for comparison_id, session in self._sessions.items()
            if session.expires_at <= now
        ]
        for comparison_id in expired:
            self._remove(comparison_id)

    def clear(self) -> None:
        for comparison_id in list(self._sessions):
            self._remove(comparison_id)

    def close(self) -> None:
        self.clear()
        shutil.rmtree(self.root, ignore_errors=True)

    def _remove(self, comparison_id: str) -> None:
        session = self._sessions.pop(comparison_id, None)
        if session is not None:
            shutil.rmtree(session.directory, ignore_errors=True)
