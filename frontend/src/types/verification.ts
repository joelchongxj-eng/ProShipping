import type { EmailCategory } from "./inbox";

/** Wire schema from origin/backend:backend/app/models.py (8733db5).
 * Backend decisions are authoritative; these types do not calculate results.
 */
export type CaseStatus = "MATCH" | "MISMATCH" | "NEEDS_REVIEW" | "FAILED";
export type FieldStatus = "match" | "mismatch" | "needs_review" | "missing";
export type ReviewReason = "wrong_doc_type" | "missing_attachment" | "unreadable" | "missing_value";
export type ShippingField = "shipper" | "consignee" | "notify_party" | "port_of_loading" | "port_of_discharge" | "container_count" | "gross_weight_kg";

export interface EmailRecord {
  email_id: string;
  /** FastAPI serializes the sender field using its Pydantic alias. */
  from: string;
  subject: string;
  body: string;
  attachments: string[];
}

export interface ExtractedField {
  field: string;
  raw_value: string;
  normalized_value: string;
  unit?: string | null;
  /** Extraction certainty, not match probability. */
  confidence: number;
  page?: number | null;
  evidence: string;
}

export interface FieldComparison {
  field: string;
  status: FieldStatus;
  si: ExtractedField | null;
  bl: ExtractedField | null;
  reason: string;
}

export type ShippingFields = Partial<Record<ShippingField, ExtractedField | null>>;

export interface VerificationCase {
  email: EmailRecord;
  /** The inspected backend puts category on CaseRecord, not EmailRecord. */
  category: EmailCategory;
  status: CaseStatus;
  si_attachment?: string | null;
  bl_attachment?: string | null;
  si_fields?: ShippingFields | null;
  bl_fields?: ShippingFields | null;
  comparison: FieldComparison[];
  review_reason?: ReviewReason | null;
}
