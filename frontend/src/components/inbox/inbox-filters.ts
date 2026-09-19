import type { EmailCategory, EmailProcessingStatus, InboxEmail } from "@/types/inbox";

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

export const processingLabels: Record<EmailProcessingStatus, string> = { classified: "Classified", processed: "Processed", needs_review: "Needs Review", failed: "Failed" };
export const CLASSIFICATION_REVIEW_THRESHOLD = 0.80;
export type CategoryFilter = EmailCategory | "all" | "uncertain";
export type ConfidenceFilter = "all" | "high" | "medium" | "low";
export interface InboxFilters { category: CategoryFilter; date: string; status: EmailProcessingStatus | "all"; confidence: ConfidenceFilter }
export const defaultFilters: InboxFilters = { category: "all", date: "all", status: "all", confidence: "all" };

export function filterEmails(emails: InboxEmail[], filters: InboxFilters): InboxEmail[] {
  return emails.filter((email) => {
    const confidence = email.classification_confidence;
    return (filters.category === "all" || (filters.category === "uncertain" ? confidence < CLASSIFICATION_REVIEW_THRESHOLD : email.category === filters.category))
      && (filters.date === "all" || email.received_at.slice(0, 10) === filters.date)
      && (filters.status === "all" || email.processing_status === filters.status)
      && (filters.confidence === "all" || (filters.confidence === "high" ? confidence >= 0.90 : filters.confidence === "medium" ? confidence >= 0.80 && confidence < 0.90 : confidence < 0.80));
  });
}
