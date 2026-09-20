import type { HumanReviewData } from "@/components/review/human-review-panel";
import type { EscalationAssignmentHistory, HumanReviewHistory, HumanReviewSummary, RetryAttemptHistory } from "@/types/human-review";
import type { CaseStatus } from "@/types/verification";

export function usesHumanReviewWorkflow(status: CaseStatus): boolean {
  return status !== "MATCH";
}

export interface CaseHumanReviewLoaders {
  summary: (emailId: string) => Promise<HumanReviewSummary>;
  history: (emailId: string) => Promise<HumanReviewHistory>;
  retries: (emailId: string) => Promise<RetryAttemptHistory>;
  escalations: (emailId: string) => Promise<EscalationAssignmentHistory>;
}

const labels = {
  summary: "Review summary",
  history: "Review history",
  retries: "Retry history",
  escalations: "Escalation history",
} as const;

export async function settleCaseHumanReviewData(emailId: string, loaders: CaseHumanReviewLoaders): Promise<HumanReviewData> {
  const results = await Promise.allSettled([
    loaders.summary(emailId),
    loaders.history(emailId),
    loaders.retries(emailId),
    loaders.escalations(emailId),
  ]);
  const keys = ["summary", "history", "retries", "escalations"] as const;
  const errors: HumanReviewData["errors"] = {};
  results.forEach((result, index) => {
    if (result.status === "rejected") errors[keys[index]] = `${labels[keys[index]]} could not be loaded.`;
  });
  return {
    summary: results[0].status === "fulfilled" ? results[0].value : null,
    history: results[1].status === "fulfilled" ? results[1].value : null,
    retries: results[2].status === "fulfilled" ? results[2].value : null,
    escalations: results[3].status === "fulfilled" ? results[3].value : null,
    errors,
  };
}
