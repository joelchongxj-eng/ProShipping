import { getCaseEscalations, getCaseRetryAttempts, getCaseReviewHistory, getCaseReviewSummary } from "./api";
import { settleCaseHumanReviewData } from "./case-detail-data";
import type { HumanReviewData } from "@/components/review/human-review-panel";

export function loadCaseHumanReviewData(emailId: string): Promise<HumanReviewData> {
  return settleCaseHumanReviewData(emailId, {
    summary: getCaseReviewSummary,
    history: getCaseReviewHistory,
    retries: getCaseRetryAttempts,
    escalations: getCaseEscalations,
  });
}

export function emptyHumanReviewData(): HumanReviewData {
  return { summary: null, history: null, retries: null, escalations: null };
}
