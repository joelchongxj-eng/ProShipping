import type { ExtractedField, FieldComparison, ShippingFields, VerificationCase } from "@/types/verification";
import type { UploadComparisonResponse, UploadedFileReference } from "@/types/upload";

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

export function isExtractedField(value: unknown): value is ExtractedField | null {
  if (value === null) return true;
  return isObject(value) && typeof value.field === "string"
    && typeof value.raw_value === "string" && typeof value.normalized_value === "string"
    && typeof value.evidence === "string" && isOptionalString(value.unit)
    && typeof value.confidence === "number" && Number.isFinite(value.confidence)
    && value.confidence >= 0 && value.confidence <= 1
    && (value.page === undefined || value.page === null || (typeof value.page === "number" && Number.isInteger(value.page)))
    && (value.source === undefined || value.source === null || isSourceLocation(value.source));
}

function isSourceLocation(value: unknown): boolean {
  if (!isObject(value) || typeof value.filename !== "string" || typeof value.evidence_text !== "string") return false;
  if (!(value.page === undefined || value.page === null || (typeof value.page === "number" && Number.isInteger(value.page) && value.page >= 1))) return false;
  if (value.locator === undefined || value.locator === null) return true;
  if (!isObject(value.locator) || typeof value.locator.kind !== "string") return false;
  const locator = value.locator;
  if (locator.kind === "txt") return Number.isInteger(locator.line_number) && Number.isInteger(locator.start_char) && Number.isInteger(locator.end_char);
  if (locator.kind === "xlsx") return typeof locator.sheet_name === "string" && typeof locator.cell_address === "string";
  if (locator.kind === "docx") return [locator.paragraph_index, locator.table_index, locator.row_index, locator.cell_index, locator.start_char, locator.end_char].every((item) => item === undefined || item === null || Number.isInteger(item));
  return locator.kind === "pdf" && Number.isInteger(locator.page) && isObject(locator.bbox)
    && [locator.bbox.x0, locator.bbox.y0, locator.bbox.x1, locator.bbox.y1].every((item) => typeof item === "number" && Number.isFinite(item));
}

export function isComparison(value: unknown): value is FieldComparison {
  return isObject(value) && typeof value.field === "string"
    && typeof value.status === "string" && ["match", "mismatch", "needs_review", "missing"].includes(value.status)
    && typeof value.reason === "string" && isExtractedField(value.si) && isExtractedField(value.bl)
    && (value.comparison_method === undefined || value.comparison_method === null || (typeof value.comparison_method === "string" && ["EXACT", "NORMALIZED", "SEMANTIC_RULE", "SEMANTIC_AI"].includes(value.comparison_method)))
    && isOptionalString(value.equivalence_reason);
}

function isShippingFields(value: unknown): value is ShippingFields | null | undefined {
  return value === undefined || value === null
    || (isObject(value) && Object.values(value).every(isExtractedField));
}

function isUploadedFileReference(value: unknown): value is UploadedFileReference {
  return isObject(value)
    && typeof value.filename === "string" && value.filename.length > 0
    && typeof value.source_filename === "string" && value.source_filename.length > 0
    && typeof value.attachment_url === "string" && value.attachment_url.startsWith("/api/upload-comparisons/");
}

export function isUploadComparisonResponse(value: unknown): value is UploadComparisonResponse {
  if (!isObject(value)) return false;
  return typeof value.comparison_id === "string" && value.comparison_id.length > 0
    && typeof value.status === "string" && ["MATCH", "MISMATCH", "NEEDS_REVIEW", "FAILED"].includes(value.status)
    && (value.review_reason === undefined || value.review_reason === null || (typeof value.review_reason === "string" && ["missing_attachment", "missing_value", "unreadable", "wrong_doc_type"].includes(value.review_reason)))
    && isUploadedFileReference(value.si_file) && isUploadedFileReference(value.bl_file)
    && isShippingFields(value.si_fields) && isShippingFields(value.bl_fields)
    && Array.isArray(value.comparison) && value.comparison.every(isComparison);
}

export function isVerificationCase(value: unknown): value is VerificationCase {
  if (!isObject(value) || !isObject(value.email)) return false;
  const email = value.email;
  return typeof email.email_id === "string" && email.email_id.length > 0
    && typeof email.from === "string" && typeof email.subject === "string" && typeof email.body === "string"
    && Array.isArray(email.attachments) && email.attachments.every((path) => typeof path === "string")
    && typeof value.category === "string" && ["BL_COMPARISON", "SI_REQUEST", "INVOICE_QUERY", "GENERAL", "SPAM"].includes(value.category)
    && typeof value.status === "string" && ["MATCH", "MISMATCH", "NEEDS_REVIEW", "FAILED"].includes(value.status)
    && Array.isArray(value.comparison) && value.comparison.every(isComparison)
    && isOptionalString(value.si_attachment) && isOptionalString(value.bl_attachment)
    && (value.review_reason === undefined || value.review_reason === null || (typeof value.review_reason === "string" && ["missing_attachment", "missing_value", "unreadable", "wrong_doc_type"].includes(value.review_reason)))
    && [value.si_fields, value.bl_fields].every(isShippingFields);
}
