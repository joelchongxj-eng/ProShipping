/** Planned Person B contract. Current CaseRecord responses do not include this field yet. */
export type HumanReviewStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CORRECTED"
  | "ACCEPTED_EQUIVALENT"
  | "MARKED_UNREADABLE"
  | "RETRY_REQUESTED"
  | "ESCALATED";
