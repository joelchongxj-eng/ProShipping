/** Provisional frontend contract; confirm with Person B before API integration.
 * Statuses and comparison reasons are supplied by the backend, never calculated here.
 */
export type CaseStatus = "matched" | "mismatch" | "needs_review" | "failed";

export type FieldStatus = "match" | "mismatch" | "uncertain" | "missing";

export type ShippingField =
  | "shipper"
  | "consignee"
  | "notify_party"
  | "port_of_loading"
  | "port_of_discharge"
  | "container_count"
  | "gross_weight_kg";

export interface Evidence {
  source_text: string;
  /** One-based document page, or null for unpaginated/unavailable sources. */
  page_number: number | null;
}

export interface ExtractedValue {
  raw_value: string | null;
  /** Text for names/ports; numbers for container count and weight in kilograms. */
  normalized_value: string | number | null;
  /** Extraction certainty from 0 to 1, NOT match probability; null if unavailable. */
  confidence: number | null;
  /** Null when no source evidence is available. */
  evidence: Evidence | null;
}

export interface FieldComparison {
  si: ExtractedValue;
  bl: ExtractedValue;
  status: FieldStatus;
  comparison_reason: string;
}

export interface CaseSummary {
  case_id: string;
  email_id: string;
  subject: string;
  sender: string;
  /** ISO 8601 timestamp with timezone. */
  received_at: string;
  status: CaseStatus;
}

export interface VerificationCase extends CaseSummary {
  /** Exactly the seven shipping fields; a missing extraction still has an entry. */
  field_comparisons: Record<ShippingField, FieldComparison>;
}
