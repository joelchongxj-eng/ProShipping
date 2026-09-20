from app.models import (
    CaseStatus,
    ComparisonMethod,
    ComparisonResult,
    ExtractedField,
    FieldComparison,
    FieldStatus,
    ShippingFields,
)
from app.services.semantic_equivalence import deterministic_equivalence


FIELD_NAMES = (
    "shipper",
    "consignee",
    "notify_party",
    "port_of_loading",
    "port_of_discharge",
    "container_count",
    "gross_weight_kg",
)


def compare_field(
    name: str,
    si: ExtractedField | None,
    bl: ExtractedField | None,
    confidence_threshold: float = 0.85,
) -> FieldComparison:
    if si is None or bl is None:
        return FieldComparison(
            field=name,
            status=FieldStatus.MISSING,
            si=si,
            bl=bl,
            reason="Required value is missing from SI or BL.",
        )
    if si.confidence < confidence_threshold or bl.confidence < confidence_threshold:
        return FieldComparison(
            field=name,
            status=FieldStatus.NEEDS_REVIEW,
            si=si,
            bl=bl,
            reason="Extraction confidence is below the review threshold.",
        )
    if si.raw_value == bl.raw_value:
        return FieldComparison(
            field=name,
            status=FieldStatus.MATCH,
            si=si,
            bl=bl,
            reason="Normalized values are equal.",
            comparison_method=ComparisonMethod.EXACT,
        )
    if si.normalized_value == bl.normalized_value:
        return FieldComparison(
            field=name,
            status=FieldStatus.MATCH,
            si=si,
            bl=bl,
            reason="Normalized values are equal.",
            comparison_method=ComparisonMethod.NORMALIZED,
        )
    semantic = deterministic_equivalence(name, si.raw_value, bl.raw_value)
    if semantic.equivalent:
        return FieldComparison(
            field=name,
            status=FieldStatus.MATCH,
            si=si,
            bl=bl,
            reason=semantic.reason or "Values are deterministically equivalent.",
            comparison_method=ComparisonMethod.SEMANTIC_RULE,
            equivalence_reason=semantic.reason,
        )
    return FieldComparison(
        field=name,
        status=FieldStatus.MISMATCH,
        si=si,
        bl=bl,
        reason="Reliable normalized values are different.",
        comparison_method=ComparisonMethod.NORMALIZED,
    )


def compare_documents(si: ShippingFields, bl: ShippingFields) -> ComparisonResult:
    fields = [compare_field(name, getattr(si, name), getattr(bl, name)) for name in FIELD_NAMES]
    statuses = {item.status for item in fields}
    if FieldStatus.MISMATCH in statuses:
        status = CaseStatus.MISMATCH
    elif FieldStatus.MISSING in statuses or FieldStatus.NEEDS_REVIEW in statuses:
        status = CaseStatus.NEEDS_REVIEW
    else:
        status = CaseStatus.MATCH
    return ComparisonResult(status=status, fields=fields)
