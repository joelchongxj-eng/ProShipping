from io import BytesIO
from zipfile import ZipFile

import pytest
from PIL import Image, ImageDraw
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject, NumberObject

from app.services.document_text import _focus_scan_image, attachment_text, attachment_text_with_vision


def office_file(member: str, xml: str) -> bytes:
    output = BytesIO()
    with ZipFile(output, "w") as archive:
        archive.writestr(member, xml)
    return output.getvalue()


def image_pdf() -> bytes:
    writer = PdfWriter()
    page = writer.add_blank_page(width=100, height=100)
    image = DecodedStreamObject()
    image.set_data(bytes([255, 255, 255] * 4))
    image.update({
        NameObject("/Type"): NameObject("/XObject"),
        NameObject("/Subtype"): NameObject("/Image"),
        NameObject("/Width"): NumberObject(2),
        NameObject("/Height"): NumberObject(2),
        NameObject("/ColorSpace"): NameObject("/DeviceRGB"),
        NameObject("/BitsPerComponent"): NumberObject(8),
    })
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/XObject"): DictionaryObject({NameObject("/Im1"): writer._add_object(image)})
    })
    content = DecodedStreamObject()
    content.set_data(b"q 100 0 0 100 0 0 cm /Im1 Do Q")
    page[NameObject("/Contents")] = writer._add_object(content)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


@pytest.mark.asyncio
async def test_scanned_pdf_uses_vision_transcription():
    seen = []

    class FakeVision:
        async def transcribe_image(self, image: bytes, mime_type: str) -> str:
            seen.append((image, mime_type))
            return "SHIPPING INSTRUCTION\nContainer Count: 2"

    text = await attachment_text_with_vision(image_pdf(), "case_SI.pdf", FakeVision())
    assert text == "SHIPPING INSTRUCTION\nContainer Count: 2"
    assert len(seen) == 1
    assert seen[0][0].startswith(b"\x89PNG")
    assert seen[0][1] == "image/png"


@pytest.mark.asyncio
async def test_blank_pdf_without_image_still_needs_review():
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    output = BytesIO()
    writer.write(output)
    with pytest.raises(ValueError, match="no extractable text|no image"):
        await attachment_text_with_vision(output.getvalue(), "case_SI.pdf", object())


def test_scan_image_focuses_on_dark_document_content():
    source = Image.new("RGB", (200, 200), "white")
    ImageDraw.Draw(source).rectangle((80, 80, 120, 120), fill="black")
    original = BytesIO()
    source.save(original, format="PNG")

    focused = Image.open(BytesIO(_focus_scan_image(original.getvalue())))
    assert focused.width < source.width
    assert focused.height < source.height
    assert focused.convert("L").getextrema()[0] == 0


def test_scan_image_returns_png_even_when_source_is_jpeg():
    source = Image.new("RGB", (100, 100), "white")
    original = BytesIO()
    source.save(original, format="JPEG")
    assert _focus_scan_image(original.getvalue()).startswith(b"\x89PNG")


def test_small_text_region_in_scanned_page_is_upscaled_for_vision():
    source = Image.new("RGB", (1240, 1754), "white")
    ImageDraw.Draw(source).rectangle((100, 100, 300, 500), fill="black")
    original = BytesIO()
    source.save(original, format="PNG")

    focused = Image.open(BytesIO(_focus_scan_image(original.getvalue())))
    assert focused.width >= 600
    assert focused.width < source.width
    assert focused.getpixel((focused.width // 2, focused.height // 2)) == (0, 0, 0)


def test_extracts_docx_paragraphs_and_table_cells_in_document_order():
    xml = """<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      <w:p><w:r><w:t>BILL OF LADING (DRAFT)</w:t></w:r></w:p>
      <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Shipper</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>ACME</w:t><w:br/><w:t>77 ROAD</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    </w:body></w:document>"""
    content = office_file("word/document.xml", xml)
    assert attachment_text(content, "case_BL.docx") == "BILL OF LADING (DRAFT)\nShipper: ACME | 77 ROAD"


def test_extracts_bilingual_docx_table_as_labeled_fields():
    xml = """<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      <w:p><w:r><w:t>BILL OF LADING (DRAFT)</w:t></w:r></w:p>
      <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Notify (通知人)</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>AL GURG STATIONERY LLC</w:t></w:r></w:p>
      <w:p><w:r><w:t>P.O. BOX 5069</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    </w:body></w:document>"""
    content = office_file("word/document.xml", xml)
    assert attachment_text(content, "case_BL.docx") == (
        "BILL OF LADING (DRAFT)\nNotify: AL GURG STATIONERY LLC | P.O. BOX 5069"
    )


def test_extracts_xlsx_inline_and_numeric_cells_by_row():
    xml = """<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
      <row><c t="inlineStr"><is><t>Shipper</t></is></c><c t="inlineStr"><is><t>ACME</t></is></c></row>
      <row><c t="inlineStr"><is><t>Container Count</t></is></c><c><v>3</v></c></row>
    </sheetData></worksheet>"""
    content = office_file("xl/worksheets/sheet1.xml", xml)
    assert attachment_text(content, "case_SI.xlsx") == "Shipper: ACME\nContainer Count: 3"


def test_extracts_xlsx_shared_strings():
    output = BytesIO()
    with ZipFile(output, "w") as archive:
        archive.writestr("xl/sharedStrings.xml", """<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <si><t>Consignee</t></si><si><t>BOB LTD</t></si></sst>""")
        archive.writestr("xl/worksheets/sheet1.xml", """<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
          <row><c t="s"><v>0</v></c><c t="s"><v>1</v></c></row></sheetData></worksheet>""")
    assert attachment_text(output.getvalue(), "case_BL.xlsx") == "Consignee: BOB LTD"


@pytest.mark.parametrize("extension,member", [("docx", "word/document.xml"), ("xlsx", "xl/worksheets/sheet1.xml")])
def test_empty_or_broken_office_document_needs_review(extension, member):
    with pytest.raises(ValueError):
        attachment_text(office_file(member, "<root/>"), f"case_SI.{extension}")
    with pytest.raises(ValueError):
        attachment_text(b"not a zip file", f"case_SI.{extension}")
