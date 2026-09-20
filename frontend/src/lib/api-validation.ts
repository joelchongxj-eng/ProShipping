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
    && (value.page === undefined || value.page === null || (typeof value.page === "number" && Number.isInteger(value.page)));
}

export function isComparison(value: unknown): value is FieldComparison {
  return isObject(value) && typeof value.field === "string"
    && typeof value.status === "string" && ["match", "mismatch", "needs_review", "missing"].includes(value.status)
    && typeof value.reason === "string" && isExtractedField(value.si) && isExtractedField(value.bl);
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
    && (value.review_reason === undefined || value.review_reason === null || (typeof value.review_reason === "string" && ["missing_attachment", "missing_value", "unreadable", "wrong_doc_type", "low_confidence_extraction"].includes(value.review_reason)))
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
    && (value.review_reason === undefined || value.review_reason === null || (typeof value.review_reason === "string" && ["missing_attachment", "missing_value", "unreadable", "wrong_doc_type", "low_confidence_extraction"].includes(value.review_reason)))
    && [value.si_fields, value.bl_fields].every(isShippingFields);
}
