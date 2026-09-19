import type { ExtractedField, FieldComparison, VerificationCase } from "@/types/verification";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isExtractedField(value: unknown): value is ExtractedField | null {
  if (value === null) return true;
  return isObject(value) && typeof value.field === "string"
    && typeof value.raw_value === "string" && typeof value.normalized_value === "string"
    && typeof value.evidence === "string" && isOptionalString(value.unit)
    && typeof value.confidence === "number" && Number.isFinite(value.confidence)
    && value.confidence >= 0 && value.confidence <= 1
    && (value.page === undefined || value.page === null || (typeof value.page === "number" && Number.isInteger(value.page)));
}

function isComparison(value: unknown): value is FieldComparison {
  return isObject(value) && typeof value.field === "string"
    && typeof value.status === "string" && ["match", "mismatch", "needs_review", "missing"].includes(value.status)
    && typeof value.reason === "string" && isExtractedField(value.si) && isExtractedField(value.bl);
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
    && (value.review_reason === undefined || value.review_reason === null || (typeof value.review_reason === "string" && ["wrong_doc_type", "missing_attachment", "unreadable", "missing_value"].includes(value.review_reason)))
    && [value.si_fields, value.bl_fields].every((fields) => fields === undefined || fields === null || (isObject(fields) && Object.values(fields).every(isExtractedField)));
}
