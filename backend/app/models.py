from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class EmailCategory(StrEnum):
    BL_COMPARISON = "BL_COMPARISON"
    SI_REQUEST = "SI_REQUEST"
    INVOICE_QUERY = "INVOICE_QUERY"
    GENERAL = "GENERAL"
    SPAM = "SPAM"


class FieldStatus(StrEnum):
    MATCH = "match"
    MISMATCH = "mismatch"
    NEEDS_REVIEW = "needs_review"
    MISSING = "missing"


class CaseStatus(StrEnum):
    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    FAILED = "FAILED"


class SubmissionStatus(StrEnum):
    OK = "OK"
    MISMATCH = "MISMATCH"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class ReviewReason(StrEnum):
    WRONG_DOC_TYPE = "wrong_doc_type"
    MISSING_ATTACHMENT = "missing_attachment"
    UNREADABLE = "unreadable"
    MISSING_VALUE = "missing_value"


class EmailRecord(BaseModel):
    email_id: str
    sender: str = Field(alias="from")
    subject: str
    body: str
    attachments: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class TxtSourceLocator(BaseModel):
    kind: Literal["txt"] = "txt"
    line_number: int = Field(ge=1)
    start_char: int = Field(ge=0)
    end_char: int = Field(ge=0)


class XlsxSourceLocator(BaseModel):
    kind: Literal["xlsx"] = "xlsx"
    sheet_name: str
    cell_address: str


class DocxSourceLocator(BaseModel):
    kind: Literal["docx"] = "docx"
    paragraph_index: int | None = Field(default=None, ge=0)
    table_index: int | None = Field(default=None, ge=0)
    row_index: int | None = Field(default=None, ge=0)
    cell_index: int | None = Field(default=None, ge=0)
    start_char: int | None = Field(default=None, ge=0)
    end_char: int | None = Field(default=None, ge=0)


class PdfBoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float


class PdfSourceLocator(BaseModel):
    kind: Literal["pdf"] = "pdf"
    page: int = Field(ge=1)
    bbox: PdfBoundingBox


SourceLocator = Annotated[
    TxtSourceLocator | XlsxSourceLocator | DocxSourceLocator | PdfSourceLocator,
    Field(discriminator="kind"),
]


class SourceLocation(BaseModel):
    filename: str
    page: int | None = None
    evidence_text: str
    locator: SourceLocator | None = None


class ExtractedField(BaseModel):
    field: str
    raw_value: str
    normalized_value: str
    unit: str | None = None
    confidence: float = Field(ge=0, le=1)
    page: int | None = None
    evidence: str
    source: SourceLocation | None = None


class ShippingFields(BaseModel):
    shipper: ExtractedField | None = None
    consignee: ExtractedField | None = None
    notify_party: ExtractedField | None = None
    port_of_loading: ExtractedField | None = None
    port_of_discharge: ExtractedField | None = None
    container_count: ExtractedField | None = None
    gross_weight_kg: ExtractedField | None = None


class FieldComparison(BaseModel):
    field: str
    status: FieldStatus
    si: ExtractedField | None
    bl: ExtractedField | None
    reason: str


class ComparisonResult(BaseModel):
    status: CaseStatus
    fields: list[FieldComparison]


class CaseRecord(BaseModel):
    email: EmailRecord
    category: EmailCategory
    status: CaseStatus
    si_attachment: str | None = None
    bl_attachment: str | None = None
    si_fields: ShippingFields | None = None
    bl_fields: ShippingFields | None = None
    comparison: list[FieldComparison] = Field(default_factory=list)
    review_reason: ReviewReason | None = None


class SubmissionEntry(BaseModel):
    category: EmailCategory
    status: SubmissionStatus
    review_reason: ReviewReason | None = None
    has_defect: bool
    defect_fields: list[str] = Field(default_factory=list)
