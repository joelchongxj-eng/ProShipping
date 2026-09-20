import type { EmailCategory, InboxDisplayRow } from "@/types/inbox";

export const categoryLabels: Record<EmailCategory, string> = {
  BL_COMPARISON: "BL Comparison",
  SI_REQUEST: "SI Request",
  INVOICE_QUERY: "Invoice Query",
  GENERAL: "General",
  SPAM: "Spam",
};

export function getCategoryLabel(category: unknown): string {
  // Unexpected runtime values get a display fallback, not a new EmailCategory member.
  return typeof category === "string" && Object.prototype.hasOwnProperty.call(categoryLabels, category)
    ? categoryLabels[category as EmailCategory]
    : "Unknown";
}

export const MOCK_CLASSIFICATION_REVIEW_THRESHOLD = 0.80;
export type CategoryFilter = EmailCategory | "all";
export type ConfidenceFilter = "all" | "high" | "medium" | "low";
export interface InboxFilters { category: CategoryFilter; date: string; confidence: ConfidenceFilter }
export const defaultFilters: InboxFilters = { category: "all", date: "all", confidence: "all" };

export function filterEmails(emails: InboxDisplayRow[], filters: InboxFilters): InboxDisplayRow[] {
  return emails.filter((email) => {
    const confidence = email.classification_confidence_mock;
    return (filters.category === "all" || email.category === filters.category)
      && (filters.date === "all" || email.received_at_mock.slice(0, 10) === filters.date)
      && (filters.confidence === "all" || (filters.confidence === "high" ? confidence >= 0.90 : filters.confidence === "medium" ? confidence >= 0.80 && confidence < 0.90 : confidence < 0.80));
  });
}
