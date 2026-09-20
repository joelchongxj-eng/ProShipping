import type { EscalationAssignment, HumanReviewQueueItem } from "./human-review";

export type SupervisorOutboundStatus = "NOT_SUBMITTED" | "SUBMITTED" | "UPDATE_REQUIRED" | "FAILED";
export type SenderOutboundStatus = "NOT_SENT" | "SENT" | "UPDATE_REQUIRED" | "FAILED";

export interface OutboundDeliverySnapshot {
  result: "SUCCEEDED" | "FAILED";
  includedItemVersions: string[];
  submittedAt?: string;
}

export interface SupervisorEscalationItem {
  itemVersion: string;
  queueItem: HumanReviewQueueItem;
  assignment: EscalationAssignment | null;
}

/** Prepared view model only; the current backend does not return sender follow-up records. */
export interface SenderFollowUpItem {
  itemVersion: string;
  emailId: string;
  subject: string;
  recipient: string | null;
  requestReason: string;
  affectedField: string | null;
  siValue: string | null;
  blValue: string | null;
  requestedInformation: string | null;
}
