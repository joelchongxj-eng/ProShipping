import re

from app.models import ExtractedField, ShippingFields, SourceLocation
from app.services.document_reader import DocumentPage
from app.services.normalization import (
    normalize_container_count,
    normalize_decimal,
    normalize_text,
    weight_to_kg,
)


FIELD_PATTERNS: dict[str, tuple[str, ...]] = {
    "shipper": (
        r"shipper(?:/exporter)?",
        r"shipper \(principal or seller\)",
        r"exporter",
    ),
    "consignee": (
        r"consignee",
        r"consignee \(non-negotiable\)",
        r"to the order of",
    ),
    "notify_party": (
        r"notify party",
        r"notify",
        r"notify party/intermediate consignee",
    ),
    "port_of_loading": (r"port of loading(?: \(pol\))?", r"load port", r"pol"),
    "port_of_discharge": (
        r"port of discharge",
        r"port of discharge \(pod\)",
        r"discharge port",
        r"pod",
    ),
    "container_count": (
        r"no\. of containers or packages",
        r"no\. of containers",
        r"total containers",
        r"container count",
        r"containers?",
    ),
    "gross_weight_kg": (
        r"gross weight(?: \(kg\))?",
        r"gross weight毛重\(kgs\)",
        r"gross wt(?: \(kgs\))?",
        r"g\.w\.",
        r"total gross weight \(kg\)",
        r"total gross wt \(kgs\)",
        r"total gross weight",
        r"total gross weightii\(kgs\)",
    ),
}


def _find_line_value(text: str, patterns: tuple[str, ...]) -> tuple[str, str] | None:
    for line in text.splitlines():
        stripped = line.strip()
        for pattern in patterns:
            match = re.match(rf"^(?:{pattern})\s*:\s*(.+?)\s*$", stripped, flags=re.IGNORECASE)
            if match:
                return match.group(1).strip(), stripped
    return None


def _find_evidence_page(
    evidence: str,
    source_pages: tuple[DocumentPage, ...],
) -> int | None:
    matching_pages = {
        page.number
        for page in source_pages
        if evidence in (line.strip() for line in page.text.splitlines())
    }
    return matching_pages.pop() if len(matching_pages) == 1 else None


def _build_field(
    name: str,
    raw_value: str,
    evidence: str,
    source_filename: str | None = None,
    source_pages: tuple[DocumentPage, ...] = (),
) -> ExtractedField:
    unit = None
    if name == "gross_weight_kg":
        weight = weight_to_kg(raw_value)
        normalized = normalize_decimal(weight) if weight is not None else normalize_text(raw_value)
        unit = "kg"
    elif name == "container_count":
        count = normalize_container_count(raw_value)
        normalized = str(count) if count is not None else normalize_text(raw_value)
    else:
        normalized = normalize_text(raw_value)
    return ExtractedField(
        field=name,
        raw_value=raw_value,
        normalized_value=normalized,
        unit=unit,
        confidence=0.99,
        page=1,
        evidence=evidence,
        source=(
            SourceLocation(
                filename=source_filename,
                page=_find_evidence_page(evidence, source_pages),
                evidence_text=evidence,
            )
            if source_filename is not None
            else None
        ),
    )


def extract_shipping_fields(
    text: str,
    *,
    source_filename: str | None = None,
    source_pages: tuple[DocumentPage, ...] = (),
) -> ShippingFields:
    extracted: dict[str, ExtractedField | None] = {}
    for name, patterns in FIELD_PATTERNS.items():
        found = _find_line_value(text, patterns)
        extracted[name] = (
            _build_field(
                name,
                *found,
                source_filename=source_filename,
                source_pages=source_pages,
            )
            if found
            else None
        )
    return ShippingFields(**extracted)
