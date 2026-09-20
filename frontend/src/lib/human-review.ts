import type { VerificationCase } from "@/types/verification";
import type { HumanReviewQueueItem, HumanReviewStatus } from "@/types/human-review";

export const reviewQueueStatuses = ["MISMATCH", "NEEDS_REVIEW"] as const;
export const humanReviewStatuses = [
  "PENDING",
  "IN_REVIEW",
  "CONFIRMED",
  "CORRECTED",
  "ACCEPTED_EQUIVALENT",
  "UNREADABLE",
  "RETRY_REQUESTED",
  "ESCALATED",
  "INFORMATION_REQUESTED",
] as const satisfies readonly HumanReviewStatus[];
export const humanReviewStatusLabels: Record<HumanReviewStatus, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  CONFIRMED: "Confirmed",
  CORRECTED: "Corrected",
  ACCEPTED_EQUIVALENT: "Accepted Equivalent",
  UNREADABLE: "Marked Unreadable",
  RETRY_REQUESTED: "Retry Requested",
  ESCALATED: "Escalated",
  INFORMATION_REQUESTED: "Information Requested",
};

export type AutomatedStatusFilter = "ALL" | (typeof reviewQueueStatuses)[number];
export type HumanReviewStatusFilter = "ALL" | HumanReviewStatus;

export function isHumanReviewStatus(value: unknown): value is HumanReviewStatus {
  return typeof value === "string"
    && humanReviewStatuses.some((status) => status === value);
}

export function isReviewQueueCase(item: VerificationCase): boolean {
  return item.category === "BL_COMPARISON"
    && reviewQueueStatuses.some((status) => item.status === status);
}

export function mockCaseToReviewQueueItem(item: VerificationCase): HumanReviewQueueItem {
  return {
    target_type: "COMPETITION_CASE",
    target_id: item.email.email_id,
    email_id: item.email.email_id,
    sender: item.email.from,
    subject: item.email.subject,
    received_at: null,
    automated_status: item.status,
    review_reason: item.review_reason ?? null,
    human_review_status: "PENDING",
    last_reviewed_at: null,
    is_escalated: false,
    active_escalation_reason: null,
    latest_email_delivery_status: null,
    retry_requested: false,
    latest_retry_execution_status: null,
    latest_retry_attempt_number: null,
    has_human_review: false,
    latest_review_action: null,
    latest_review_id: null,
  };
}

export function filterReviewQueue(
  cases: HumanReviewQueueItem[],
  automatedStatusFilter: AutomatedStatusFilter,
  humanReviewStatusFilter: HumanReviewStatusFilter,
  search: string,
): HumanReviewQueueItem[] {
  const query = search.trim().toLocaleLowerCase();
  return cases.filter((item) => {
    const matchesAutomatedStatus = automatedStatusFilter === "ALL"
      || item.automated_status === automatedStatusFilter;
    const matchesHumanReviewStatus = humanReviewStatusFilter === "ALL"
      || item.human_review_status === humanReviewStatusFilter;
    const matchesSearch = !query
      || item.email_id.toLocaleLowerCase().includes(query)
      || item.subject.toLocaleLowerCase().includes(query);
    return matchesAutomatedStatus && matchesHumanReviewStatus && matchesSearch;
  });
}

export function summarizeReviewQueue(cases: HumanReviewQueueItem[]) {
  return {
    total: cases.length,
    mismatch: cases.filter((item) => item.automated_status === "MISMATCH").length,
    needsReview: cases.filter((item) => item.automated_status === "NEEDS_REVIEW").length,
  };
}
