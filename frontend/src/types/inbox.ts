/** Email categories aligned with the backend contract. */
export type EmailCategory =
  | "BL_COMPARISON"
  | "SI_REQUEST"
  | "INVOICE_QUERY"
  | "GENERAL"
  | "SPAM";

/** Frontend view model derived from the backend case list. */
export interface InboxDisplayRow {
  email_id: string;
  sender: string;
  subject: string;
  body: string;
  attachments: string[];
  category: EmailCategory;
  /** Null until CaseRecord exposes the classifier's reason through the API. */
  classification_reason: string | null;
}
