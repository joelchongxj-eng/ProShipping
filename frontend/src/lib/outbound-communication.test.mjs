import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSubmissionTargetHref,
  deliveryStatusLabel,
  dispatchCanBeResent,
  submissionActionLabel,
  submissionActionDisabled,
  submissionSectionLabel,
} from "./outbound-communication.ts";
import { isSubmissionDispatch, isSubmissionWorkflowResponse } from "./submission-api-validation.ts";
import {
  submissionActionPaths,
  submissionProxyRemovePath,
  submissionRemovePath,
  submissionResendPath,
  submissionWorkflowPath,
} from "./submission-api-contract.ts";

function item(targetId = "email_412") {
  return {
    target_type: "COMPETITION_CASE",
    target_id: targetId,
    subject: "Draft BL review",
    sender_email: "sender@example.com",
    automated_status: "MISMATCH",
    review_reason: null,
    field: "gross_weight_kg",
    si_value: "25000",
    bl_value: "24500",
    reason: "Confirm the corrected weight.",
    source_review_id: "review-1",
    added_at: "2026-09-21T01:00:00Z",
  };
}

function dispatch(status = "SENT") {
  return {
    dispatch_id: "dispatch-1",
    channel: "SUPERVISOR",
    dispatch_type: "INITIAL",
    created_at: "2026-09-21T01:00:00Z",
    completed_at: "2026-09-21T01:00:01Z",
    parent_dispatch_id: null,
    item_snapshot: [item()],
    added_target_ids: ["email_412"],
    removed_target_ids: [],
    successful_snapshot_target_ids: status === "SENT" ? ["email_412"] : [],
    outcomes: [{ recipient: "supervisor@example.com", status, attempted_at: "2026-09-21T01:00:00Z", error_reason: null }],
  };
}

function workflow(sectionStatus = "DRAFT") {
  const section = {
    status: sectionStatus,
    items: [item()],
    added_since_last_send: 1,
    removed_since_last_send: 0,
    last_sent_at: null,
    dispatches: [dispatch()],
  };
  return { supervisor: section, sender_follow_up: { ...section, items: [] } };
}

test("uses backend section states for submit, update, and success labels", () => {
  assert.equal(submissionActionLabel("supervisor", "DRAFT"), "Submit to Supervisor");
  assert.equal(submissionActionLabel("sender", "DRAFT"), "Send to Sender");
  assert.equal(submissionActionLabel("supervisor", "UPDATE_REQUIRED"), "Send Update");
  assert.equal(submissionActionLabel("sender", "UPDATE_REQUIRED"), "Send Update");
  assert.equal(submissionActionLabel("supervisor", "SUBMITTED"), null);
  assert.equal(submissionSectionLabel("SUBMITTED"), "Submitted");
  assert.equal(submissionActionDisabled("DRAFT", 0), true);
  assert.equal(submissionActionDisabled("DRAFT", 1), false);
  assert.equal(submissionActionDisabled("UPDATE_REQUIRED", 0), false);
});

test("only failed and not-configured dispatches are resendable", () => {
  assert.equal(dispatchCanBeResent(dispatch("SENT")), false);
  assert.equal(dispatchCanBeResent(dispatch("FAILED")), true);
  assert.equal(dispatchCanBeResent(dispatch("NOT_CONFIGURED")), true);
  assert.equal(deliveryStatusLabel("NOT_CONFIGURED"), "Not Configured");
});

test("View Case preserves Submission context and upload identifiers remain separate", () => {
  assert.equal(buildSubmissionTargetHref("COMPETITION_CASE", "email_412"), "/cases/email_412?from=%2Fsubmission");
  assert.equal(buildSubmissionTargetHref("UPLOAD_COMPARISON", "upload-1"), "/upload/upload-1");
});

test("accepts the exact backend workflow and dispatch contracts", () => {
  assert.equal(isSubmissionWorkflowResponse(workflow()), true);
  assert.equal(isSubmissionDispatch(dispatch("FAILED")), true);
  assert.equal(isSubmissionWorkflowResponse({ ...workflow(), supervisor: { ...workflow().supervisor, status: "FAILED" } }), false);
});

test("uses the dedicated backend workflow, remove, send, update, and resend routes", () => {
  assert.equal(submissionWorkflowPath, "/api/submission-workflow");
  assert.equal(submissionActionPaths["supervisor-submit"], "/api/submission/supervisor/submit");
  assert.equal(submissionActionPaths["supervisor-update"], "/api/submission/supervisor/update");
  assert.equal(submissionActionPaths["sender-send"], "/api/submission/sender/send");
  assert.equal(submissionActionPaths["sender-update"], "/api/submission/sender/update");
  assert.equal(submissionRemovePath("supervisor", "email/412"), "/api/submission-workflow/supervisor/email%2F412");
  assert.equal(submissionProxyRemovePath("sender", "email 412"), "/api/outbound-submission?channel=sender&target_id=email+412");
  assert.equal(submissionResendPath("dispatch/1"), "/api/submission/dispatches/dispatch%2F1/resend");
});
