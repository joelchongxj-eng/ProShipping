from typing import Protocol

import httpx

from app.models import EmailRecord


class InboxProtocol(Protocol):
    async def list_emails(self) -> list[EmailRecord]: ...

    async def get_attachment(self, path: str) -> bytes: ...


class InboxClient:
    def __init__(self, base_url: str = "http://localhost:8080") -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(base_url=self.base_url, timeout=30)

    async def list_emails(self) -> list[EmailRecord]:
        response = await self._client.get("/emails")
        response.raise_for_status()
        return [EmailRecord.model_validate(item) for item in response.json()]

    async def get_email(self, email_id: str) -> EmailRecord:
        response = await self._client.get(f"/emails/{email_id}")
        response.raise_for_status()
        return EmailRecord.model_validate(response.json())

    async def get_attachment(self, path: str) -> bytes:
        normalized_path = path.removeprefix("attachments/").lstrip("/")
        response = await self._client.get(f"/attachments/{normalized_path}")
        response.raise_for_status()
        return response.content

    async def close(self) -> None:
        await self._client.aclose()

