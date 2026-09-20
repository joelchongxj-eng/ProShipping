"""Extract text from supported shipping-document attachments."""

from io import BytesIO
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

import pymupdf
from PIL import Image
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.services.ai_service import AIResponseError, AIService
from app.services.document_reader import DocumentContent, DocumentPage


class DocumentReadError(ValueError):
    pass


WORD = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
SHEET = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
PDF_RENDER_DPI = 144
PDF_RENDER_SCALE = PDF_RENDER_DPI / 72


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


def _office_text(content: bytes, extension: str) -> str:
    try:
        with ZipFile(BytesIO(content)) as archive:
            if extension == ".docx":
                root = ElementTree.fromstring(archive.read("word/document.xml"))
                lines = [_paragraph_text(paragraph) for paragraph in root.iter(WORD + "p")]
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


async def rendered_pdf_document_with_vision(
    content: bytes,
    path: str,
    service: AIService,
) -> DocumentContent:
    if not path.casefold().endswith(".pdf"):
        raise DocumentReadError("Vision rendering is supported only for PDF attachments")
    try:
        document = pymupdf.open(stream=content, filetype="pdf")
    except (pymupdf.FileDataError, pymupdf.EmptyFileError, OSError, ValueError) as exc:
        raise DocumentReadError("Scanned PDF could not be opened") from exc

    pages: list[DocumentPage] = []
    try:
        for page_number, page in enumerate(document, start=1):
            try:
                pixmap = page.get_pixmap(
                    matrix=pymupdf.Matrix(PDF_RENDER_SCALE, PDF_RENDER_SCALE),
                    alpha=False,
                )
                image = pixmap.tobytes("png")
                transcript = await service.transcribe_image(image, "image/png")
            except AIResponseError as exc:
                raise DocumentReadError("Scanned PDF could not be transcribed") from exc
            pages.append(DocumentPage(number=page_number, text=transcript))
    except (RuntimeError, ValueError, MemoryError) as exc:
        raise DocumentReadError("Scanned PDF page could not be rendered") from exc
    finally:
        document.close()

    if not pages:
        raise DocumentReadError("Scanned PDF has no pages")
    page_tuple = tuple(pages)
    return DocumentContent(
        text="\n".join(page.text for page in page_tuple),
        pages=page_tuple,
    )


async def attachment_text_with_vision(content: bytes, path: str, service: AIService) -> str:
    try:
        return attachment_text(content, path)
    except PdfReadError as exc:
        if not path.casefold().endswith(".pdf") or "no extractable text" not in str(exc):
            raise
    return (await rendered_pdf_document_with_vision(content, path, service)).text
