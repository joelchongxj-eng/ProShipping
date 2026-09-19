import re
from dataclasses import dataclass
from io import BytesIO
from pathlib import PurePosixPath
from zipfile import BadZipFile

import pymupdf
from docx import Document
from docx.opc.exceptions import PackageNotFoundError
from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException


class DocumentReadError(Exception):
    """The attachment format is unsupported or its content cannot be read."""


@dataclass(frozen=True)
class DocumentPage:
    number: int
    text: str


@dataclass(frozen=True)
class DocumentSourceLine:
    text: str
    line_number: int | None = None
    sheet_name: str | None = None
    cell_address: str | None = None
    source_text: str | None = None
    paragraph_index: int | None = None
    table_index: int | None = None
    row_index: int | None = None
    cell_index: int | None = None


@dataclass(frozen=True)
class DocumentContent:
    text: str
    pages: tuple[DocumentPage, ...] = ()
    source_lines: tuple[DocumentSourceLine, ...] = ()


CHINESE_PRESENTATION_SUFFIX = re.compile(
    r"\s+\([^()]*[\u3400-\u9fff][^()]*\)\s*$"
)


def _cell_to_text(value: object) -> str:
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _xlsx_to_document(content: bytes) -> DocumentContent:
    try:
        workbook = load_workbook(BytesIO(content), data_only=True, read_only=True)
    except (BadZipFile, InvalidFileException, OSError, ValueError) as exc:
        raise DocumentReadError("Unable to read XLSX attachment.") from exc

    try:
        worksheet = workbook.active
        lines: list[str] = []
        source_lines: list[DocumentSourceLine] = []
        for label_cell, value_cell in worksheet.iter_rows(
            min_col=1,
            max_col=2,
            values_only=False,
        ):
            label = label_cell.value
            value = value_cell.value
            if label is None or value is None:
                continue
            label_text = _cell_to_text(label)
            value_text = _cell_to_text(value)
            if label_text and value_text:
                line = f"{label_text}: {value_text}"
                lines.append(line)
                source_lines.append(
                    DocumentSourceLine(
                        text=line,
                        sheet_name=worksheet.title,
                        cell_address=value_cell.coordinate,
                    )
                )
        return DocumentContent(
            text="\n".join(lines),
            source_lines=tuple(source_lines),
        )
    finally:
        workbook.close()


def _docx_cell_to_text(cell: object) -> str:
    parts: list[str] = []
    for paragraph in cell.paragraphs:
        parts.extend(part.strip() for part in paragraph.text.splitlines() if part.strip())
    return " | ".join(parts)


def _docx_to_document(content: bytes) -> DocumentContent:
    try:
        document = Document(BytesIO(content))
    except (BadZipFile, PackageNotFoundError, OSError, ValueError) as exc:
        raise DocumentReadError("Unable to read DOCX attachment.") from exc

    lines: list[str] = []
    source_lines: list[DocumentSourceLine] = []
    for table_index, table in enumerate(document.tables):
        for row_index, row in enumerate(table.rows):
            if len(row.cells) < 2:
                continue
            label = _docx_cell_to_text(row.cells[0])
            value = _docx_cell_to_text(row.cells[1])
            label = CHINESE_PRESENTATION_SUFFIX.sub("", label).strip()
            if label and value:
                line = f"{label}: {value}"
                lines.append(line)
                source_lines.append(
                    DocumentSourceLine(
                        text=line,
                        source_text=row.cells[1].text,
                        table_index=table_index,
                        row_index=row_index,
                        cell_index=1,
                    )
                )

    if lines:
        return DocumentContent(
            text="\n".join(lines),
            source_lines=tuple(source_lines),
        )

    for paragraph_index, paragraph in enumerate(document.paragraphs):
        source_text = paragraph.text
        line = source_text.strip()
        if not re.fullmatch(r".+?\s*:\s*.+", line):
            continue
        lines.append(line)
        source_lines.append(
            DocumentSourceLine(
                text=line,
                source_text=source_text,
                paragraph_index=paragraph_index,
            )
        )
    return DocumentContent(
        text="\n".join(lines),
        source_lines=tuple(source_lines),
    )


def _pdf_page_to_text(page: pymupdf.Page) -> str:
    raw_text = page.get_text("text", sort=True).strip()
    positioned_lines: list[tuple[float, float, str]] = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                text = span["text"].strip()
                if text:
                    x0, y0, _, _ = span["bbox"]
                    positioned_lines.append((y0, x0, text))

    rows: list[list[tuple[float, str]]] = []
    for y0, x0, text in sorted(positioned_lines):
        if not rows or abs(y0 - rows[-1][0][0]) > 1:
            rows.append([(y0, x0, text)])
        else:
            rows[-1].append((y0, x0, text))

    canonical_rows: list[str] = []
    for row in rows:
        components = sorted((x0, text) for _, x0, text in row)
        if len(components) < 2:
            continue
        label = components[0][1]
        value = " ".join(text for _, text in components[1:])
        canonical_rows.append(f"{label}: {value}")

    return "\n".join(part for part in (raw_text, *canonical_rows) if part)


def _pdf_to_document(content: bytes) -> DocumentContent:
    try:
        document = pymupdf.open(stream=content, filetype="pdf")
    except (pymupdf.FileDataError, pymupdf.EmptyFileError, OSError, ValueError) as exc:
        raise DocumentReadError("Unable to read PDF attachment.") from exc

    try:
        pages = tuple(
            DocumentPage(number=index, text=_pdf_page_to_text(page))
            for index, page in enumerate(document, start=1)
        )
        text = "\n".join(page.text for page in pages).strip()
    except (RuntimeError, ValueError) as exc:
        raise DocumentReadError("Unable to read PDF attachment.") from exc
    finally:
        document.close()

    if not text:
        raise DocumentReadError("PDF attachment contains no extractable text.")
    return DocumentContent(text=text, pages=pages)


def read_document(filename: str, content: bytes) -> DocumentContent:
    suffix = PurePosixPath(filename).suffix.casefold()
    if suffix == ".txt":
        text = content.decode("utf-8-sig")
        return DocumentContent(
            text=text,
            source_lines=tuple(
                DocumentSourceLine(text=line, line_number=line_number)
                for line_number, line in enumerate(text.splitlines(), start=1)
            ),
        )
    if suffix == ".xlsx":
        return _xlsx_to_document(content)
    if suffix == ".docx":
        return _docx_to_document(content)
    if suffix == ".pdf":
        return _pdf_to_document(content)
    raise DocumentReadError(f"Unsupported document format: {suffix or '<none>'}")


def document_to_text(filename: str, content: bytes) -> str:
    return read_document(filename, content).text
