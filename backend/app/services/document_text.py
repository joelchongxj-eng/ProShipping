"""Extract text from supported shipping-document attachments."""

from io import BytesIO
import re
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from PIL import Image
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.services.ai_service import AIResponseError, AIService


class DocumentReadError(ValueError):
    pass


WORD = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
SHEET = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def _paragraph_text(paragraph: ElementTree.Element) -> str:
    parts = []
    for node in paragraph.iter():
        if node.tag == WORD + "t":
            parts.append(node.text or "")
        elif node.tag in {WORD + "br", WORD + "cr"}:
            parts.append("\n")
        elif node.tag == WORD + "tab":
            parts.append("\t")
    return "".join(parts).strip()


def _docx_lines(root: ElementTree.Element) -> list[str]:
    lines = []
    body = root.find(WORD + "body")
    if body is None:
        body = root
    for block in body:
        if block.tag == WORD + "p":
            lines.append(_paragraph_text(block))
        elif block.tag == WORD + "tbl":
            for row in block.iter(WORD + "tr"):
                cells = [" | ".join(
                    part.strip() for paragraph in cell.iter(WORD + "p")
                    for part in _paragraph_text(paragraph).splitlines() if part.strip()
                ) for cell in row.findall(WORD + "tc")]
                if len(cells) == 2 and all(cells):
                    label = re.sub(r"\s+\([^)]*[\u3400-\u9fff][^)]*\)$", "", cells[0])
                    lines.append(f"{label}: {cells[1]}")
                else:
                    lines.extend(cells)
    return lines


def _office_text(content: bytes, extension: str) -> str:
    try:
        with ZipFile(BytesIO(content)) as archive:
            if extension == ".docx":
                root = ElementTree.fromstring(archive.read("word/document.xml"))
                lines = _docx_lines(root)
            else:
                shared = []
                if "xl/sharedStrings.xml" in archive.namelist():
                    strings = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
                    shared = ["".join(node.text or "" for node in item.iter(SHEET + "t"))
                              for item in strings.iter(SHEET + "si")]
                lines = []
                for name in sorted(item for item in archive.namelist()
                                   if item.startswith("xl/worksheets/sheet") and item.endswith(".xml")):
                    root = ElementTree.fromstring(archive.read(name))
                    for row in root.iter(SHEET + "row"):
                        cells = []
                        for cell in row.findall(SHEET + "c"):
                            kind = cell.get("t")
                            value = cell.find(SHEET + "v")
                            if kind == "inlineStr":
                                text = "".join(node.text or "" for node in cell.iter(SHEET + "t"))
                            elif kind == "s" and value is not None and value.text is not None:
                                text = shared[int(value.text)]
                            else:
                                text = value.text if value is not None and value.text is not None else ""
                            if text.strip():
                                cells.append(text.strip())
                        lines.append(": ".join(cells) if len(cells) == 2 else " | ".join(cells))
    except (BadZipFile, KeyError, IndexError, ValueError, ElementTree.ParseError) as exc:
        raise DocumentReadError("Office document could not be read") from exc
    text = "\n".join(line for line in lines if line)
    if not text.strip():
        raise DocumentReadError("Office document has no extractable text")
    return text


def attachment_text(content: bytes, path: str) -> str:
    extension = path.rsplit(".", 1)[-1].casefold()
    if extension == "pdf":
        text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages)
        if not text.strip():
            raise PdfReadError("PDF has no extractable text")
        return text
    if extension in {"docx", "xlsx"}:
        return _office_text(content, "." + extension)
    return content.decode("utf-8-sig")


def _focus_scan_image(image_data: bytes) -> bytes:
    image = Image.open(BytesIO(image_data)).convert("RGB")
    dark = image.convert("L").point(lambda value: 255 if value < 180 else 0)
    bounds = dark.getbbox()
    if bounds is not None:
        left, top, right, bottom = bounds
        margin = 25
        box = (max(0, left - margin), max(0, top - margin),
               min(image.width, right + margin), min(image.height, bottom + margin))
        image = image.crop(box)
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


async def attachment_text_with_vision(content: bytes, path: str, service: AIService) -> str:
    try:
        return attachment_text(content, path)
    except PdfReadError as exc:
        if not path.casefold().endswith(".pdf") or "no extractable text" not in str(exc):
            raise
    pages = PdfReader(BytesIO(content)).pages
    lines = []
    for page in pages:
        if len(page.images) != 1:
            raise DocumentReadError("Scanned PDF page has no image or multiple images")
        try:
            image = page.images[0]
        except (ImportError, ValueError) as exc:
            raise DocumentReadError("Scanned PDF image could not be read") from exc
        try:
            lines.append(await service.transcribe_image(_focus_scan_image(image.data), "image/png"))
        except AIResponseError as exc:
            raise DocumentReadError("Scanned PDF could not be transcribed") from exc
    if not lines:
        raise DocumentReadError("Scanned PDF has no pages")
    return "\n".join(lines)
