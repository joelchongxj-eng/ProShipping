import re
from io import BytesIO
from pathlib import PurePosixPath
from zipfile import BadZipFile

from docx import Document
from docx.opc.exceptions import PackageNotFoundError
from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException


class DocumentReadError(Exception):
    """The attachment format is unsupported or its content cannot be read."""


CHINESE_PRESENTATION_SUFFIX = re.compile(
    r"\s+\([^()]*[\u3400-\u9fff][^()]*\)\s*$"
)


def _cell_to_text(value: object) -> str:
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _xlsx_to_text(content: bytes) -> str:
    try:
        workbook = load_workbook(BytesIO(content), data_only=True, read_only=True)
    except (BadZipFile, InvalidFileException, OSError, ValueError) as exc:
        raise DocumentReadError("Unable to read XLSX attachment.") from exc

    try:
        worksheet = workbook.active
        lines: list[str] = []
        for label, value in worksheet.iter_rows(min_col=1, max_col=2, values_only=True):
            if label is None or value is None:
                continue
            label_text = _cell_to_text(label)
            value_text = _cell_to_text(value)
            if label_text and value_text:
                lines.append(f"{label_text}: {value_text}")
        return "\n".join(lines)
    finally:
        workbook.close()


def _docx_cell_to_text(cell: object) -> str:
    parts: list[str] = []
    for paragraph in cell.paragraphs:
        parts.extend(part.strip() for part in paragraph.text.splitlines() if part.strip())
    return " | ".join(parts)


def _docx_to_text(content: bytes) -> str:
    try:
        document = Document(BytesIO(content))
    except (BadZipFile, PackageNotFoundError, OSError, ValueError) as exc:
        raise DocumentReadError("Unable to read DOCX attachment.") from exc

    lines: list[str] = []
    for table in document.tables:
        for row in table.rows:
            if len(row.cells) < 2:
                continue
            label = _docx_cell_to_text(row.cells[0])
            value = _docx_cell_to_text(row.cells[1])
            label = CHINESE_PRESENTATION_SUFFIX.sub("", label).strip()
            if label and value:
                lines.append(f"{label}: {value}")
    return "\n".join(lines)


def document_to_text(filename: str, content: bytes) -> str:
    suffix = PurePosixPath(filename).suffix.casefold()
    if suffix == ".txt":
        return content.decode("utf-8-sig")
    if suffix == ".xlsx":
        return _xlsx_to_text(content)
    if suffix == ".docx":
        return _docx_to_text(content)
    raise DocumentReadError(f"Unsupported document format: {suffix or '<none>'}")
