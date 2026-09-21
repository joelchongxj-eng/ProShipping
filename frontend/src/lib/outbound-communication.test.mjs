import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSubmissionTargetHref,
  deliveryStatusLabel,
  dispatchCanBeResent,
  mutateSubmissionAndReload,
  submissionActionLabel,
  submissionActionDisabled,
  submissionRemoveLabel,
  submissionRemoveTooltip,
  submissionSectionLabel,
} from "./outbound-communication.ts";
import { isSubmissionDispatch, isSubmissionWorkflowResponse } from "./submission-api-validation.ts";
import { forwardSubmissionRequest } from "./submission-proxy.ts";
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
  assert.equal(submissionProxyRemovePath("supervisor", "email_013"), "/api/outbound-submission?channel=supervisor&target_id=email_013");
  assert.equal(submissionRemovePath("supervisor", "email_013"), "/api/submission-workflow/supervisor/email_013");
  assert.equal(submissionRemovePath("sender", "email_043"), "/api/submission-workflow/sender/email_043");
  assert.equal(submissionRemovePath("supervisor", "email/412"), "/api/submission-workflow/supervisor/email%2F412");
  assert.equal(submissionProxyRemovePath("sender", "email 412"), "/api/outbound-submission?channel=sender&target_id=email+412");
  assert.equal(submissionResendPath("dispatch/1"), "/api/submission/dispatches/dispatch%2F1/resend");
});

test("submission mutation waits for DELETE and then reloads backend workflow", async () => {
  const calls = [];
  const refreshed = { supervisor: { status: "UPDATE_REQUIRED", items: [] } };
  const result = await mutateSubmissionAndReload(
    async () => { calls.push(["supervisor-delete", "email_013"]); },
    async () => { calls.push(["workflow-get"]); return refreshed; },
  );
  assert.deepEqual(calls, [["supervisor-delete", "email_013"], ["workflow-get"]]);
  assert.equal(result.supervisor.status, "UPDATE_REQUIRED");
});

test("sender removal uses sender DELETE and reloads backend workflow", async () => {
  const calls = [];
  await mutateSubmissionAndReload(
    async () => { calls.push(["sender-delete", "email_043"]); },
    async () => { calls.push(["workflow-get"]); return workflow(); },
  );
  assert.deepEqual(calls, [["sender-delete", "email_043"], ["workflow-get"]]);
});

test("failed removal does not reload or hide the item", async () => {
  let reloadCalled = false;
  await assert.rejects(
    mutateSubmissionAndReload(
      async () => { throw new Error("delete failed"); },
      async () => { reloadCalled = true; return workflow(); },
    ),
    /delete failed/,
  );
  assert.equal(reloadCalled, false);
});

test("remove control has accurate accessible text", () => {
  assert.equal(submissionRemoveLabel("email_013"), "Remove case email_013 from the current submission list");
  assert.equal(submissionRemoveTooltip, "Remove this case from the current submission list.");
});

test("submission proxy preserves backend HTTP errors", async () => {
  const response = await forwardSubmissionRequest(
    "http://localhost:8000/api/submission-workflow/supervisor/missing",
    "DELETE",
    async () => Response.json({ detail: "Active submission item not found." }, { status: 404 }),
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { detail: "Active submission item not found." });
});

test("submission proxy forwards bodyless HTTP statuses without constructing a response body", async () => {
  for (const status of [204, 205, 304]) {
    let bodyRead = false;
    const response = await forwardSubmissionRequest(
      "http://localhost:8000/api/submission-workflow/supervisor/email_004",
      "DELETE",
      async () => ({
        status,
        headers: new Headers(),
        arrayBuffer: async () => {
          bodyRead = true;
          return new ArrayBuffer(0);
        },
      }),
    );
    assert.equal(response.status, status);
    assert.equal(bodyRead, false);
    assert.equal(await response.text(), "");
  }
});

test("submission proxy returns 502 only when fetch receives no HTTP response", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const response = await forwardSubmissionRequest(
      "http://127.0.0.1:65534/api/submission-workflow/supervisor/email_013",
      "DELETE",
      async () => { throw new TypeError("fetch failed"); },
    );
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      detail: "Backend unavailable. Check that the backend is running and try again.",
    });
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
});
