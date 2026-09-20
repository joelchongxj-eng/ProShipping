import type {
  EscalationAssignment,
  EscalationAssignmentHistory,
  EscalationDeliveryAttempt,
  EffectiveFieldValue,
  HumanReviewHistory,
  HumanReviewQueueItem,
  HumanReviewQueueResponse,
  HumanReviewRecord,
  HumanReviewSummary,
  RetryAttempt,
  RetryAttemptHistory,
} from "@/types/human-review";
import { isObject, isUploadComparisonResponse, isVerificationCase } from "./api-validation";
import { backendHumanReviewStatuses, backendReviewActions, isBackendReviewTargetType } from "./human-review-contract";

const caseStatuses = ["MATCH", "MISMATCH", "NEEDS_REVIEW", "FAILED"];
const reviewReasons = ["missing_attachment", "missing_value", "unreadable", "wrong_doc_type"];
const reviewStatuses: readonly string[] = backendHumanReviewStatuses;
const reviewActions: readonly string[] = backendReviewActions;
const retryStatuses = ["PENDING", "RUNNING", "SUCCEEDED", "FAILED"];
const deliveryStatuses = ["SENT", "FAILED", "NOT_CONFIGURED"];
const shippingFields = ["shipper", "consignee", "notify_party", "port_of_loading", "port_of_discharge", "container_count", "gross_weight_kg"];
const fieldStatuses = ["match", "mismatch", "needs_review", "missing"];
const reviewScopes = ["CASE", "FIELD"];
const reviewSides = ["SI", "BL", "BOTH"];

function optionalString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function enumOrNull(value: unknown, values: readonly string[]): boolean {
  return value === null || (typeof value === "string" && values.includes(value));
}

function isReviewTargetType(value: unknown): boolean {
  return isBackendReviewTargetType(value);
}

function isReviewRecord(value: unknown): value is HumanReviewRecord {
  return isObject(value)
    && typeof value.review_id === "string"
    && isReviewTargetType(value.target_type)
    && typeof value.target_id === "string"
    && typeof value.scope === "string" && reviewScopes.includes(value.scope)
    && enumOrNull(value.field, shippingFields)
    && enumOrNull(value.side, reviewSides)
    && typeof value.action === "string" && reviewActions.includes(value.action)
    && typeof value.automated_status === "string" && caseStatuses.includes(value.automated_status)
    && enumOrNull(value.automated_field_status, fieldStatuses)
    && optionalString(value.original_value)
    && optionalString(value.original_si_value)
    && optionalString(value.original_bl_value)
    && optionalString(value.corrected_value)
    && optionalString(value.note)
    && typeof value.review_status === "string" && reviewStatuses.includes(value.review_status)
    && typeof value.is_escalated === "boolean"
    && optionalString(value.escalation_reason)
    && optionalString(value.request_reason)
    && optionalString(value.escalated_at)
    && typeof value.automated_result_hash === "string"
    && typeof value.created_at === "string"
    && Number.isInteger(value.sequence) && Number(value.sequence) >= 1;
}

function isEffectiveSideValue(value: unknown): boolean {
  return isObject(value)
    && optionalString(value.automated_value)
    && optionalString(value.reviewed_value)
    && optionalString(value.effective_value);
}

function isEffectiveFieldValue(value: unknown): value is EffectiveFieldValue {
  return isObject(value)
    && isEffectiveSideValue(value.si)
    && isEffectiveSideValue(value.bl)
    && typeof value.accepted_equivalent === "boolean";
}

export function isHumanReviewHistory(value: unknown): value is HumanReviewHistory {
  return isObject(value)
    && isReviewTargetType(value.target_type)
    && typeof value.target_id === "string"
    && Array.isArray(value.reviews)
    && value.reviews.every(isReviewRecord);
}

export function isHumanReviewSummary(value: unknown): value is HumanReviewSummary {
  return isObject(value)
    && isReviewTargetType(value.target_type)
    && typeof value.target_id === "string"
    && typeof value.automated_status === "string" && caseStatuses.includes(value.automated_status)
    && typeof value.review_status === "string" && reviewStatuses.includes(value.review_status)
    && typeof value.is_escalated === "boolean"
    && optionalString(value.escalation_reason)
    && optionalString(value.escalated_at)
    && (value.latest_review === null || isReviewRecord(value.latest_review))
    && (value.case_review === null || isReviewRecord(value.case_review))
    && Array.isArray(value.field_reviews)
    && value.field_reviews.every((item) => isObject(item)
      && typeof item.field === "string" && shippingFields.includes(item.field)
      && typeof item.side === "string" && reviewSides.includes(item.side)
      && typeof item.review_status === "string" && reviewStatuses.includes(item.review_status)
      && isReviewRecord(item.latest_review))
    && isObject(value.effective_values)
    && Object.entries(value.effective_values).every(([field, item]) => shippingFields.includes(field) && isEffectiveFieldValue(item))
    && Number.isInteger(value.review_count) && Number(value.review_count) >= 0;
}

function isRetryAttempt(value: unknown): value is RetryAttempt {
  return isObject(value)
    && typeof value.retry_id === "string"
    && isReviewTargetType(value.target_type)
    && typeof value.target_id === "string"
    && Number.isInteger(value.attempt_number) && Number(value.attempt_number) >= 1
    && typeof value.requested_review_id === "string"
    && typeof value.execution_status === "string" && retryStatuses.includes(value.execution_status)
    && optionalString(value.started_at)
    && optionalString(value.completed_at)
    && typeof value.previous_automated_status === "string" && caseStatuses.includes(value.previous_automated_status)
    && enumOrNull(value.new_automated_status, caseStatuses)
    && typeof value.previous_result_hash === "string"
    && optionalString(value.new_result_hash)
    && optionalString(value.error_reason)
    && (value.new_automated_result === null || isVerificationCase(value.new_automated_result) || isUploadComparisonResponse(value.new_automated_result));
}

export function isRetryAttemptHistory(value: unknown): value is RetryAttemptHistory {
  return isObject(value)
    && isReviewTargetType(value.target_type)
    && typeof value.target_id === "string"
    && Array.isArray(value.attempts)
    && value.attempts.every(isRetryAttempt);
}

export { isReviewRecord as isHumanReviewRecord };

function isDeliveryAttempt(value: unknown): value is EscalationDeliveryAttempt {
  return isObject(value)
    && typeof value.attempt_id === "string"
    && Number.isInteger(value.attempt_number)
    && typeof value.status === "string" && deliveryStatuses.includes(value.status)
    && typeof value.attempted_at === "string"
    && optionalString(value.error_reason);
}

export function isHumanReviewQueueItem(value: unknown): value is HumanReviewQueueItem {
  return isObject(value)
    && isReviewTargetType(value.target_type)
    && typeof value.target_id === "string"
    && typeof value.email_id === "string"
    && typeof value.sender === "string"
    && typeof value.subject === "string"
    && optionalString(value.received_at)
    && typeof value.automated_status === "string" && caseStatuses.includes(value.automated_status)
    && enumOrNull(value.review_reason, reviewReasons)
    && typeof value.human_review_status === "string" && reviewStatuses.includes(value.human_review_status)
    && optionalString(value.last_reviewed_at)
    && typeof value.is_escalated === "boolean"
    && optionalString(value.active_escalation_reason)
    && enumOrNull(value.latest_email_delivery_status, deliveryStatuses)
    && typeof value.retry_requested === "boolean"
    && enumOrNull(value.latest_retry_execution_status, retryStatuses)
    && (value.latest_retry_attempt_number === null || Number.isInteger(value.latest_retry_attempt_number))
    && typeof value.has_human_review === "boolean"
    && enumOrNull(value.latest_review_action, reviewActions)
    && optionalString(value.latest_review_id);
}

export function isHumanReviewQueueResponse(value: unknown): value is HumanReviewQueueResponse {
  return isObject(value)
    && Number.isInteger(value.total) && Number(value.total) >= 0
    && Number.isInteger(value.offset) && Number(value.offset) >= 0
    && Number.isInteger(value.limit) && Number(value.limit) >= 1
    && Array.isArray(value.items) && value.items.every(isHumanReviewQueueItem);
}

export function isEscalationAssignment(value: unknown): value is EscalationAssignment {
  return isObject(value)
    && typeof value.assignment_id === "string"
    && typeof value.review_id === "string"
    && isReviewTargetType(value.target_type)
    && typeof value.target_id === "string"
    && typeof value.field === "string" && shippingFields.includes(value.field)
    && optionalString(value.si_value)
    && optionalString(value.bl_value)
    && typeof value.escalation_reason === "string"
    && typeof value.reviewer_action === "string"
    && typeof value.requested_decision === "string"
    && optionalString(value.supervisor_email)
    && enumOrNull(value.delivery_status, deliveryStatuses)
    && Array.isArray(value.delivery_attempts) && value.delivery_attempts.every(isDeliveryAttempt)
    && typeof value.created_at === "string";
}

export function isEscalationAssignmentHistory(value: unknown): value is EscalationAssignmentHistory {
  return isObject(value)
    && isReviewTargetType(value.target_type)
    && typeof value.target_id === "string"
    && Array.isArray(value.assignments)
    && value.assignments.every(isEscalationAssignment);
}
