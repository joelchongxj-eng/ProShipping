"""Extract text from supported shipping-document attachments."""

from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError


def attachment_text(content: bytes, path: str) -> str:
    if path.casefold().endswith(".pdf"):
        text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages)
        if not text.strip():
            raise PdfReadError("PDF has no extractable text")
        return text
    return content.decode("utf-8-sig")
