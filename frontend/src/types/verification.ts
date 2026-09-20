import type { EmailCategory } from "./inbox";

/** Wire schema from origin/backend:backend/app/models.py (8733db5).
 * Backend decisions are authoritative; these types do not calculate results.
 */
export type CaseStatus = "MATCH" | "MISMATCH" | "NEEDS_REVIEW" | "FAILED";
export type FieldStatus = "match" | "mismatch" | "needs_review" | "missing";
export type ReviewReason =
  | "missing_attachment"
  | "missing_value"
  | "unreadable"
  | "wrong_doc_type"
  | "low_confidence_extraction";
export type ShippingField = "shipper" | "consignee" | "notify_party" | "port_of_loading" | "port_of_discharge" | "container_count" | "gross_weight_kg";

export type SourceLocator =
  | { kind: "txt"; line_number: number; start_char: number; end_char: number }
  | { kind: "xlsx"; sheet_name: string; cell_address: string }
  | { kind: "docx"; paragraph_index?: number | null; table_index?: number | null; row_index?: number | null; cell_index?: number | null; start_char?: number | null; end_char?: number | null }
  | { kind: "pdf"; page: number; bbox: { x0: number; y0: number; x1: number; y1: number } };

export interface SourceLocation {
  filename: string;
  page?: number | null;
  evidence_text: string;
  locator?: SourceLocator | null;
}

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
  source?: SourceLocation | null;
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
