"""Extract text from supported shipping-document attachments."""

from io import BytesIO
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from pypdf import PdfReader
from pypdf.errors import PdfReadError


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
