/** Email categories aligned with the backend contract. */
export type EmailCategory =
  | "BL_COMPARISON"
  | "SI_REQUEST"
  | "INVOICE_QUERY"
  | "GENERAL"
  | "SPAM";
export type EmailProcessingStatus = "classified" | "processed" | "needs_review" | "failed";

export interface InboxEmail {
  email_id: string;
  sender: string;
  subject: string;
  /** ISO 8601 timestamp with timezone. */
  received_at: string;
  /** Predicted category remains visible even when confidence is low. */
  category: EmailCategory;
  /** Email classification certainty (0-1), not field extraction confidence. */
  classification_confidence: number;
  processing_status: EmailProcessingStatus;
  case_id?: string;
}
