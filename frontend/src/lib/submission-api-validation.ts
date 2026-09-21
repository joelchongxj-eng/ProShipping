import type { SubmissionDeliveryOutcome, SubmissionDispatch, SubmissionItem, SubmissionSection, SubmissionWorkflowResponse } from "@/types/outbound";

const targetTypes = ["COMPETITION_CASE", "UPLOAD_COMPARISON"];
const caseStatuses = ["MATCH", "MISMATCH", "NEEDS_REVIEW", "FAILED"];
const reviewReasons = ["missing_attachment", "missing_value", "unreadable", "wrong_doc_type"];
const shippingFields = ["shipper", "consignee", "notify_party", "port_of_loading", "port_of_discharge", "container_count", "gross_weight_kg"];
const sectionStatuses = ["DRAFT", "SUBMITTED", "UPDATE_REQUIRED"];
const channels = ["SUPERVISOR", "SENDER"];
const dispatchTypes = ["INITIAL", "UPDATE", "RESEND"];
const deliveryStatuses = ["SENT", "FAILED", "NOT_CONFIGURED"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSubmissionItem(value: unknown): value is SubmissionItem {
  return isObject(value)
    && typeof value.target_type === "string" && targetTypes.includes(value.target_type)
    && typeof value.target_id === "string"
    && typeof value.subject === "string"
    && stringOrNull(value.sender_email)
    && typeof value.automated_status === "string" && caseStatuses.includes(value.automated_status)
    && (value.review_reason === null || (typeof value.review_reason === "string" && reviewReasons.includes(value.review_reason)))
    && typeof value.field === "string" && shippingFields.includes(value.field)
    && stringOrNull(value.si_value)
    && stringOrNull(value.bl_value)
    && typeof value.reason === "string"
    && typeof value.source_review_id === "string"
    && typeof value.added_at === "string";
}

function isDeliveryOutcome(value: unknown): value is SubmissionDeliveryOutcome {
  return isObject(value)
    && stringOrNull(value.recipient)
    && typeof value.status === "string" && deliveryStatuses.includes(value.status)
    && typeof value.attempted_at === "string"
    && stringOrNull(value.error_reason);
}

export function isSubmissionDispatch(value: unknown): value is SubmissionDispatch {
  return isObject(value)
    && typeof value.dispatch_id === "string"
    && typeof value.channel === "string" && channels.includes(value.channel)
    && typeof value.dispatch_type === "string" && dispatchTypes.includes(value.dispatch_type)
    && typeof value.created_at === "string"
    && typeof value.completed_at === "string"
    && stringOrNull(value.parent_dispatch_id)
    && Array.isArray(value.item_snapshot) && value.item_snapshot.every(isSubmissionItem)
    && stringArray(value.added_target_ids)
    && stringArray(value.removed_target_ids)
    && stringArray(value.successful_snapshot_target_ids)
    && Array.isArray(value.outcomes) && value.outcomes.every(isDeliveryOutcome);
}

function isSubmissionSection(value: unknown): value is SubmissionSection {
  return isObject(value)
    && typeof value.status === "string" && sectionStatuses.includes(value.status)
    && Array.isArray(value.items) && value.items.every(isSubmissionItem)
    && Number.isInteger(value.added_since_last_send) && Number(value.added_since_last_send) >= 0
    && Number.isInteger(value.removed_since_last_send) && Number(value.removed_since_last_send) >= 0
    && stringOrNull(value.last_sent_at)
    && Array.isArray(value.dispatches) && value.dispatches.every(isSubmissionDispatch);
}

export function isSubmissionWorkflowResponse(value: unknown): value is SubmissionWorkflowResponse {
  return isObject(value)
    && isSubmissionSection(value.supervisor)
    && isSubmissionSection(value.sender_follow_up);
}
