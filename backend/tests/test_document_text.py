from io import BytesIO
from zipfile import ZipFile

import pytest

from app.services.document_text import attachment_text


def office_file(member: str, xml: str) -> bytes:
    output = BytesIO()
    with ZipFile(output, "w") as archive:
        archive.writestr(member, xml)
    return output.getvalue()


def test_extracts_docx_paragraphs_and_table_cells_in_document_order():
    xml = """<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      <w:p><w:r><w:t>BILL OF LADING (DRAFT)</w:t></w:r></w:p>
      <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Shipper</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>ACME</w:t><w:br/><w:t>77 ROAD</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    </w:body></w:document>"""
    content = office_file("word/document.xml", xml)
    assert attachment_text(content, "case_BL.docx") == "BILL OF LADING (DRAFT)\nShipper\nACME\n77 ROAD"


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
