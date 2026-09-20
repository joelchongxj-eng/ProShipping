import type { CaseStatus, FieldStatus, ReviewReason, ShippingField, VerificationCase } from "./verification";
import type { UploadComparisonResponse } from "./upload";

export type ReviewTargetType = "COMPETITION_CASE" | "UPLOAD_COMPARISON";
export type ReviewAction = "CONFIRM" | "CORRECT" | "EQUIVALENT" | "UNREADABLE" | "ADD_NOTE" | "RETRY" | "ESCALATE";
export type ReviewScope = "CASE" | "FIELD";
export type ReviewSide = "SI" | "BL" | "BOTH";

export type HumanReviewStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "CONFIRMED"
  | "CORRECTED"
  | "ACCEPTED_EQUIVALENT"
  | "UNREADABLE"
  | "RETRY_REQUESTED"
  | "ESCALATED";

export type EscalationDeliveryStatus = "SENT" | "FAILED" | "NOT_CONFIGURED";
export type RetryExecutionStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface CreateHumanReviewRequest {
  scope: ReviewScope;
  field?: ShippingField;
  side?: ReviewSide;
  action: ReviewAction;
  corrected_value?: string;
  note?: string;
  escalation_reason?: string;
  reviewer_action?: string;
  requested_decision?: string;
}

export interface HumanReviewRecord {
  review_id: string;
  target_type: ReviewTargetType;
  target_id: string;
  scope: ReviewScope;
  field: ShippingField | null;
  side: ReviewSide | null;
  action: ReviewAction;
  automated_status: CaseStatus;
  automated_field_status: FieldStatus | null;
  original_value: string | null;
  original_si_value: string | null;
  original_bl_value: string | null;
  corrected_value: string | null;
  note: string | null;
  review_status: HumanReviewStatus;
  is_escalated: boolean;
  escalation_reason: string | null;
  escalated_at: string | null;
  automated_result_hash: string;
  created_at: string;
  sequence: number;
}

export interface HumanReviewHistory {
  target_type: ReviewTargetType;
  target_id: string;
  reviews: HumanReviewRecord[];
}

export interface EffectiveSideValue {
  automated_value: string | null;
  reviewed_value: string | null;
  effective_value: string | null;
}

export interface EffectiveFieldValue {
  si: EffectiveSideValue;
  bl: EffectiveSideValue;
  accepted_equivalent: boolean;
}

export interface FieldReviewSummary {
  field: ShippingField;
  side: ReviewSide;
  review_status: HumanReviewStatus;
  latest_review: HumanReviewRecord;
}

export interface HumanReviewSummary {
  target_type: ReviewTargetType;
  target_id: string;
  automated_status: CaseStatus;
  review_status: HumanReviewStatus;
  is_escalated: boolean;
  escalation_reason: string | null;
  escalated_at: string | null;
  latest_review: HumanReviewRecord | null;
  case_review: HumanReviewRecord | null;
  field_reviews: FieldReviewSummary[];
  effective_values: Partial<Record<ShippingField, EffectiveFieldValue>>;
  review_count: number;
}

export interface RetryAttempt {
  retry_id: string;
  target_type: ReviewTargetType;
  target_id: string;
  attempt_number: number;
  requested_review_id: string;
  execution_status: RetryExecutionStatus;
  started_at: string | null;
  completed_at: string | null;
  previous_automated_status: CaseStatus;
  new_automated_status: CaseStatus | null;
  previous_result_hash: string;
  new_result_hash: string | null;
  error_reason: string | null;
  new_automated_result: VerificationCase | UploadComparisonResponse | null;
}

export interface RetryAttemptHistory {
  target_type: ReviewTargetType;
  target_id: string;
  attempts: RetryAttempt[];
}

export interface HumanReviewQueueItem {
  target_type: ReviewTargetType;
  target_id: string;
  email_id: string;
  sender: string;
  subject: string;
  received_at: string | null;
  automated_status: CaseStatus;
  review_reason: ReviewReason | null;
  human_review_status: HumanReviewStatus;
  last_reviewed_at: string | null;
  is_escalated: boolean;
  active_escalation_reason: string | null;
  latest_email_delivery_status: EscalationDeliveryStatus | null;
  retry_requested: boolean;
  latest_retry_execution_status: RetryExecutionStatus | null;
  latest_retry_attempt_number: number | null;
  has_human_review: boolean;
  latest_review_action: ReviewAction | null;
  latest_review_id: string | null;
}

export interface HumanReviewQueueResponse {
  total: number;
  offset: number;
  limit: number;
  items: HumanReviewQueueItem[];
}

export interface EscalationDeliveryAttempt {
  attempt_id: string;
  attempt_number: number;
  status: EscalationDeliveryStatus;
  attempted_at: string;
  error_reason: string | null;
}

export interface EscalationAssignment {
  assignment_id: string;
  review_id: string;
  target_type: ReviewTargetType;
  target_id: string;
  field: ShippingField;
  si_value: string | null;
  bl_value: string | null;
  escalation_reason: string;
  reviewer_action: string;
  requested_decision: string;
  supervisor_email: string | null;
  delivery_status: EscalationDeliveryStatus | null;
  delivery_attempts: EscalationDeliveryAttempt[];
  created_at: string;
}

export interface EscalationAssignmentHistory {
  target_type: ReviewTargetType;
  target_id: string;
  assignments: EscalationAssignment[];
}
