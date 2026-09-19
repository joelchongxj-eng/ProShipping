import re

from app.models import ExtractedField, ShippingFields
from app.services.normalization import (
    normalize_container_count,
    normalize_decimal,
    normalize_party,
    normalize_text,
    weight_to_kg,
)


FIELD_PATTERNS: dict[str, tuple[str, ...]] = {
    "shipper": (r"shipper(?:/exporter| \(principal or seller\))?",),
    "consignee": (r"consignee(?: \(non-negotiable\))?",),
    "notify_party": (r"notify party", r"notify"),
    "port_of_loading": (r"port of loading(?: \(pol\))?", r"load port", r"pol"),
    "port_of_discharge": (r"port of discharge", r"discharge port", r"pod"),
    "container_count": (
        r"no\. of containers or packages",
        r"container count",
        r"total containers",
        r"containers?",
    ),
    "gross_weight_kg": (r"gross weight(?: \(kg\))?", r"gross wt(?: \(kgs\))?", r"g\.w\."),
}


def _find_line_value(text: str, patterns: tuple[str, ...]) -> tuple[str, str] | None:
    for line in text.splitlines():
        stripped = line.strip()
        for pattern in patterns:
            match = re.match(rf"^(?:{pattern})\s*:\s*(.+?)\s*$", stripped, flags=re.IGNORECASE)
            if match:
                return match.group(1).strip(), stripped
    return None


def _build_field(name: str, raw_value: str, evidence: str) -> ExtractedField:
    unit = None
    if name == "gross_weight_kg":
        weight = weight_to_kg(raw_value)
        normalized = normalize_decimal(weight) if weight is not None else normalize_text(raw_value)
        unit = "kg"
    elif name == "container_count":
        count = normalize_container_count(raw_value)
        normalized = str(count) if count is not None else normalize_text(raw_value)
    elif name in {"shipper", "consignee", "notify_party"}:
        normalized = normalize_party(raw_value)
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
    )


def extract_shipping_fields(text: str) -> ShippingFields:
    extracted: dict[str, ExtractedField | None] = {}
    for name, patterns in FIELD_PATTERNS.items():
        found = _find_line_value(text, patterns)
        extracted[name] = _build_field(name, *found) if found else None
    return ShippingFields(**extracted)

