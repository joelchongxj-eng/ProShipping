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

export type CategoryFilter = EmailCategory | "all";
export interface InboxFilters { category: CategoryFilter }
export const defaultFilters: InboxFilters = { category: "all" };

export function filterEmails(emails: InboxDisplayRow[], filters: InboxFilters): InboxDisplayRow[] {
  return filters.category === "all"
    ? emails
    : emails.filter((email) => email.category === filters.category);
}
