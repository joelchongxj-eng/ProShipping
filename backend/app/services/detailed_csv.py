import csv
import io
from collections.abc import Iterable

from app.models import CaseRecord, FieldStatus, ShippingFields


DETAILED_CSV_FIELDS = (
    "shipper",
    "consignee",
    "notify_party",
    "port_of_loading",
    "port_of_discharge",
    "container_count",
    "gross_weight_kg",
)

DETAILED_CSV_COLUMNS = (
    "email_id",
    "category",
    "processing_status",
    "review_reason",
    "si_attachment",
    "bl_attachment",
    *(
        f"si_{field}_{detail}"
        for field in DETAILED_CSV_FIELDS
        for detail in ("raw", "normalized", "evidence")
    ),
    *(
        f"bl_{field}_{detail}"
        for field in DETAILED_CSV_FIELDS
        for detail in ("raw", "normalized", "evidence")
    ),
    *(
        column
        for field in DETAILED_CSV_FIELDS
        for column in (f"{field}_status", f"{field}_reason")
    ),
    "defect_fields",
)


def _add_extracted_fields(
    row: dict[str, str],
    prefix: str,
    shipping_fields: ShippingFields | None,
) -> None:
    for field_name in DETAILED_CSV_FIELDS:
        extracted = getattr(shipping_fields, field_name) if shipping_fields is not None else None
        row[f"{prefix}_{field_name}_raw"] = extracted.raw_value if extracted is not None else ""
        row[f"{prefix}_{field_name}_normalized"] = (
            extracted.normalized_value if extracted is not None else ""
        )
        row[f"{prefix}_{field_name}_evidence"] = extracted.evidence if extracted is not None else ""


def _case_row(case: CaseRecord) -> dict[str, str]:
    row = {
        "email_id": case.email.email_id,
        "category": case.category.value,
        "processing_status": case.status.value,
        "review_reason": case.review_reason.value if case.review_reason is not None else "",
        "si_attachment": case.si_attachment or "",
        "bl_attachment": case.bl_attachment or "",
    }
    _add_extracted_fields(row, "si", case.si_fields)
    _add_extracted_fields(row, "bl", case.bl_fields)

    comparisons = {item.field: item for item in case.comparison}
    for field_name in DETAILED_CSV_FIELDS:
        comparison = comparisons.get(field_name)
        row[f"{field_name}_status"] = comparison.status.value if comparison is not None else ""
        row[f"{field_name}_reason"] = comparison.reason if comparison is not None else ""

    row["defect_fields"] = ";".join(
        item.field for item in case.comparison if item.status is FieldStatus.MISMATCH
    )
    return row


def build_detailed_csv(cases: Iterable[CaseRecord]) -> str:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=DETAILED_CSV_COLUMNS, lineterminator="\r\n")
    writer.writeheader()
    for case in cases:
        writer.writerow(_case_row(case))
    return output.getvalue()
