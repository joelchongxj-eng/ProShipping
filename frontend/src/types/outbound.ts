import type { ReviewTargetType } from "./human-review";
import type { CaseStatus, ReviewReason, ShippingField } from "./verification";

export type SubmissionChannel = "SUPERVISOR" | "SENDER";
export type SubmissionSectionStatus = "DRAFT" | "SUBMITTED" | "UPDATE_REQUIRED";
export type SubmissionDispatchType = "INITIAL" | "UPDATE" | "RESEND";
export type SubmissionDeliveryStatus = "SENT" | "FAILED" | "NOT_CONFIGURED";

export interface SubmissionItem {
  target_type: ReviewTargetType;
  target_id: string;
  subject: string;
  sender_email: string | null;
  automated_status: CaseStatus;
  review_reason: ReviewReason | null;
  field: ShippingField;
  si_value: string | null;
  bl_value: string | null;
  reason: string;
  source_review_id: string;
  added_at: string;
}

export interface SubmissionDeliveryOutcome {
  recipient: string | null;
  status: SubmissionDeliveryStatus;
  attempted_at: string;
  error_reason: string | null;
}

export interface SubmissionDispatch {
  dispatch_id: string;
  channel: SubmissionChannel;
  dispatch_type: SubmissionDispatchType;
  created_at: string;
  completed_at: string;
  parent_dispatch_id: string | null;
  item_snapshot: SubmissionItem[];
  added_target_ids: string[];
  removed_target_ids: string[];
  successful_snapshot_target_ids: string[];
  outcomes: SubmissionDeliveryOutcome[];
}

export interface SubmissionSection {
  status: SubmissionSectionStatus;
  items: SubmissionItem[];
  added_since_last_send: number;
  removed_since_last_send: number;
  last_sent_at: string | null;
  dispatches: SubmissionDispatch[];
}

export interface SubmissionWorkflowResponse {
  supervisor: SubmissionSection;
  sender_follow_up: SubmissionSection;
}
