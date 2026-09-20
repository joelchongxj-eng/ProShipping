import type { VerificationCase } from "@/types/verification";
import type { HumanReviewStatus } from "@/types/human-review";

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
};

export type AutomatedStatusFilter = "ALL" | (typeof reviewQueueStatuses)[number];
export type HumanReviewStatusFilter = "ALL" | HumanReviewStatus;
export type HumanReviewQueueCase = VerificationCase & {
  /** Optional until the backend adds Human Review state to its response contract. */
  human_review_status?: HumanReviewStatus | null;
};

export function isHumanReviewStatus(value: unknown): value is HumanReviewStatus {
  return typeof value === "string"
    && humanReviewStatuses.some((status) => status === value);
}

export function getHumanReviewStatus(item: HumanReviewQueueCase): HumanReviewStatus | null {
  return isHumanReviewStatus(item.human_review_status) ? item.human_review_status : null;
}

export function hasHumanReviewStatusData(cases: HumanReviewQueueCase[]): boolean {
  return cases.some((item) => getHumanReviewStatus(item) !== null);
}

export function isReviewQueueCase(item: VerificationCase): boolean {
  return item.category === "BL_COMPARISON"
    && reviewQueueStatuses.some((status) => item.status === status);
}

export function filterReviewQueue(
  cases: HumanReviewQueueCase[],
  automatedStatusFilter: AutomatedStatusFilter,
  humanReviewStatusFilter: HumanReviewStatusFilter,
  search: string,
): HumanReviewQueueCase[] {
  const query = search.trim().toLocaleLowerCase();
  return cases.filter((item) => {
    const matchesAutomatedStatus = automatedStatusFilter === "ALL"
      || item.status === automatedStatusFilter;
    const matchesHumanReviewStatus = humanReviewStatusFilter === "ALL"
      || getHumanReviewStatus(item) === humanReviewStatusFilter;
    const matchesSearch = !query
      || item.email.email_id.toLocaleLowerCase().includes(query)
      || item.email.subject.toLocaleLowerCase().includes(query);
    return matchesAutomatedStatus && matchesHumanReviewStatus && matchesSearch;
  });
}

export function summarizeReviewQueue(cases: VerificationCase[]) {
  return {
    total: cases.length,
    mismatch: cases.filter((item) => item.status === "MISMATCH").length,
    needsReview: cases.filter((item) => item.status === "NEEDS_REVIEW").length,
  };
}
