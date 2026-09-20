from enum import StrEnum

from pydantic import BaseModel, ConfigDict

from app.models import EmailCategory, ShippingFields


class Classification(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: EmailCategory
    reason: str
    uncertain: bool


class DocumentType(StrEnum):
    SI = "SI"
    BL = "BL"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


class SemanticDecision(StrEnum):
    EQUIVALENT = "EQUIVALENT"
    DIFFERENT = "DIFFERENT"
    UNCERTAIN = "UNCERTAIN"


class SemanticEquivalenceResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: SemanticDecision
    canonical_value: str | None
    reason: str


class RawField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    raw_value: str
    evidence: str


class RawShippingFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shipper: RawField | None = None
    consignee: RawField | None = None
    notify_party: RawField | None = None
    port_of_loading: RawField | None = None
    port_of_discharge: RawField | None = None
    container_count: RawField | None = None
    gross_weight_kg: RawField | None = None


class RawDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_type: DocumentType
    fields: RawShippingFields


class ExtractedDocument(BaseModel):
    document_type: DocumentType
    fields: ShippingFields
