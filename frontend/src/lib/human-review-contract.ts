export const backendReviewActions = ["CONFIRM", "CORRECT", "EQUIVALENT", "UNREADABLE", "ADD_NOTE", "RETRY", "ESCALATE", "REQUEST_INFORMATION"] as const;
export const backendHumanReviewStatuses = ["PENDING", "IN_REVIEW", "CONFIRMED", "CORRECTED", "ACCEPTED_EQUIVALENT", "UNREADABLE", "RETRY_REQUESTED", "ESCALATED", "INFORMATION_REQUESTED"] as const;
export const backendReviewTargetTypes = ["COMPETITION_CASE", "UPLOAD_COMPARISON"] as const;

export function isBackendReviewAction(value: unknown): boolean {
  return typeof value === "string" && backendReviewActions.some((item) => item === value);
}

export function isBackendHumanReviewStatus(value: unknown): boolean {
  return typeof value === "string" && backendHumanReviewStatuses.some((item) => item === value);
}

export function isBackendReviewTargetType(value: unknown): boolean {
  return typeof value === "string" && backendReviewTargetTypes.some((item) => item === value);
}
