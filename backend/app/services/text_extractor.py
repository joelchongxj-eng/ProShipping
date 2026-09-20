import re

from app.models import (
    DocxSourceLocator,
    ExtractedField,
    PdfBoundingBox,
    PdfSourceLocator,
    ShippingFields,
    SourceLocation,
    SourceLocator,
    TxtSourceLocator,
    XlsxSourceLocator,
)
from app.services.document_reader import (
    DocumentPage,
    DocumentSourceLine,
    PdfSourceCharacter,
)
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


_FIELD_LABEL_BOUNDARY = re.compile(
    r"(?<!\S)(?:"
    + "|".join(
        rf"(?P<{name}>{'|'.join(f'(?:{pattern})' for pattern in sorted(patterns, key=len, reverse=True))})"
        for name, patterns in FIELD_PATTERNS.items()
    )
    + r")\s*:\s*",
    flags=re.IGNORECASE,
)


def _find_line_values(text: str) -> dict[str, tuple[str, str]]:
    found: dict[str, tuple[str, str]] = {}
    for line in text.splitlines():
        stripped = line.strip()
        matches = list(_FIELD_LABEL_BOUNDARY.finditer(stripped))
        for index, match in enumerate(matches):
            name = match.lastgroup
            if name is None or name in found:
                continue
            segment_end = (
                matches[index + 1].start()
                if index + 1 < len(matches)
                else len(stripped)
            )
            raw_value = stripped[match.end():segment_end].strip()
            if not raw_value:
                continue
            evidence = stripped[match.start():segment_end].strip()
            found[name] = (raw_value, evidence)
    return found


def _find_evidence_page(
    evidence: str,
    source_pages: tuple[DocumentPage, ...],
) -> int | None:
    matching_pages = {
        page.number
        for page in source_pages
        if any(evidence in line.strip() for line in page.text.splitlines())
    }
    return matching_pages.pop() if len(matching_pages) == 1 else None


def _find_source_locator(
    evidence: str,
    raw_value: str,
    source_lines: tuple[DocumentSourceLine, ...],
    source_page: int | None = None,
) -> SourceLocator | None:
    if source_page is not None:
        pdf_locator = _find_pdf_source_locator(
            evidence,
            raw_value,
            source_lines,
            source_page,
        )
        if pdf_locator is not None:
            return pdf_locator

    matching_lines = [
        source_line
        for source_line in source_lines
        if source_line.text.strip().count(evidence) == 1
    ]
    if len(matching_lines) != 1:
        return None

    source_line = matching_lines[0]
    if source_line.line_number is not None:
        evidence_start = source_line.text.find(evidence)
        evidence_end = evidence_start + len(evidence)
        occurrences = [
            occurrence
            for occurrence in re.finditer(re.escape(raw_value), source_line.text)
            if evidence_start <= occurrence.start() and occurrence.end() <= evidence_end
        ]
        if len(occurrences) != 1:
            return None
        occurrence = occurrences[0]
        return TxtSourceLocator(
            line_number=source_line.line_number,
            start_char=occurrence.start(),
            end_char=occurrence.end(),
        )

    if source_line.sheet_name is not None and source_line.cell_address is not None:
        return XlsxSourceLocator(
            sheet_name=source_line.sheet_name,
            cell_address=source_line.cell_address,
        )

    if source_line.paragraph_index is not None or source_line.table_index is not None:
        if source_line.source_text is None:
            return None
        evidence_occurrences = list(
            re.finditer(re.escape(evidence), source_line.source_text)
        )
        if len(evidence_occurrences) == 1:
            evidence_occurrence = evidence_occurrences[0]
            occurrences = [
                occurrence
                for occurrence in re.finditer(
                    re.escape(raw_value),
                    source_line.source_text,
                )
                if evidence_occurrence.start() <= occurrence.start()
                and occurrence.end() <= evidence_occurrence.end()
            ]
        else:
            occurrences = list(
                re.finditer(re.escape(raw_value), source_line.source_text)
            )
        if len(occurrences) != 1:
            return None
        occurrence = occurrences[0]
        return DocxSourceLocator(
            paragraph_index=source_line.paragraph_index,
            table_index=source_line.table_index,
            row_index=source_line.row_index,
            cell_index=source_line.cell_index,
            start_char=occurrence.start(),
            end_char=occurrence.end(),
        )
    return None


def _pdf_bbox_for_occurrence(
    characters: tuple[PdfSourceCharacter, ...],
    start: int,
    end: int,
) -> tuple[float, float, float, float] | None:
    selected = characters[start:end]
    if len(selected) != end - start:
        return None
    if any(
        character.bbox is None and not character.text.isspace()
        for character in selected
    ):
        return None
    boxes = [character.bbox for character in selected if character.bbox is not None]
    if not boxes:
        return None
    y0_values = [bbox[1] for bbox in boxes]
    y1_values = [bbox[3] for bbox in boxes]
    if max(y0_values) - min(y0_values) > 1 or max(y1_values) - min(y1_values) > 1:
        return None
    return (
        min(bbox[0] for bbox in boxes),
        min(y0_values),
        max(bbox[2] for bbox in boxes),
        max(y1_values),
    )


def _pdf_occurrence_bboxes(
    raw_value: str,
    source_lines: tuple[DocumentSourceLine, ...],
    source_page: int,
    *,
    evidence: str | None = None,
) -> set[tuple[float, float, float, float]]:
    boxes: set[tuple[float, float, float, float]] = set()
    for source_line in source_lines:
        if source_line.page_number != source_page or source_line.source_text is None:
            continue
        if evidence is not None and source_line.text.strip().count(evidence) != 1:
            continue
        for occurrence in re.finditer(re.escape(raw_value), source_line.source_text):
            bbox = _pdf_bbox_for_occurrence(
                source_line.pdf_characters,
                occurrence.start(),
                occurrence.end(),
            )
            if bbox is not None:
                boxes.add(bbox)
    return boxes


def _find_pdf_source_locator(
    evidence: str,
    raw_value: str,
    source_lines: tuple[DocumentSourceLine, ...],
    source_page: int,
) -> PdfSourceLocator | None:
    page_boxes = _pdf_occurrence_bboxes(raw_value, source_lines, source_page)
    evidence_boxes = _pdf_occurrence_bboxes(
        raw_value,
        source_lines,
        source_page,
        evidence=evidence,
    )
    if len(page_boxes) != 1 or evidence_boxes != page_boxes:
        return None
    x0, y0, x1, y1 = next(iter(page_boxes))
    return PdfSourceLocator(
        page=source_page,
        bbox=PdfBoundingBox(x0=x0, y0=y0, x1=x1, y1=y1),
    )


def _build_field(
    name: str,
    raw_value: str,
    evidence: str,
    source_filename: str | None = None,
    source_pages: tuple[DocumentPage, ...] = (),
    source_lines: tuple[DocumentSourceLine, ...] = (),
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
    source_page = _find_evidence_page(evidence, source_pages)
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
                page=source_page,
                evidence_text=evidence,
                locator=_find_source_locator(
                    evidence,
                    raw_value,
                    source_lines,
                    source_page,
                ),
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
    source_lines: tuple[DocumentSourceLine, ...] = (),
) -> ShippingFields:
    extracted: dict[str, ExtractedField | None] = {}
    found_fields = _find_line_values(text)
    for name in FIELD_PATTERNS:
        found = found_fields.get(name)
        extracted[name] = (
            _build_field(
                name,
                *found,
                source_filename=source_filename,
                source_pages=source_pages,
                source_lines=source_lines,
            )
            if found
            else None
        )
    return ShippingFields(**extracted)
