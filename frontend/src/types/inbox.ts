/** Email categories aligned with the backend contract. */
export type EmailCategory =
  | "BL_COMPARISON"
  | "SI_REQUEST"
  | "INVOICE_QUERY"
  | "GENERAL"
  | "SPAM";

/** Frontend view model. Fields ending in `_mock` are never supplied by the backend. */
export interface InboxDisplayRow {
  email_id: string;
  sender: string;
  subject: string;
  body: string;
  attachments: string[];
  category: EmailCategory;
  /** Deterministic presentation metadata until the backend provides received_at. */
  received_at_mock: string;
  /** Mock email-classification certainty (0-1); never field extraction confidence. */
  classification_confidence_mock: number;
}
