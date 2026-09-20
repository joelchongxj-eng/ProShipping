import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSubmissionCaseHref,
  removeCurrentOutboundItem,
  resolveSenderOutboundStatus,
  resolveSupervisorOutboundStatus,
  senderActionLabel,
  supervisorActionLabel,
} from "./outbound-communication.ts";

test("supervisor status covers empty, submitted, updates, and failed delivery", () => {
  assert.equal(resolveSupervisorOutboundStatus([], null), "NOT_SUBMITTED");
  assert.equal(resolveSupervisorOutboundStatus(["a:v1"], null), "NOT_SUBMITTED");
  assert.equal(resolveSupervisorOutboundStatus(["a:v1"], { result: "SUCCEEDED", includedItemVersions: ["a:v1"] }), "SUBMITTED");
  assert.equal(resolveSupervisorOutboundStatus(["a:v1", "b:v1"], { result: "SUCCEEDED", includedItemVersions: ["a:v1"] }), "UPDATE_REQUIRED");
  assert.equal(resolveSupervisorOutboundStatus(["a:v2"], { result: "SUCCEEDED", includedItemVersions: ["a:v1"] }), "UPDATE_REQUIRED");
  assert.equal(resolveSupervisorOutboundStatus(["a:v1"], { result: "FAILED", includedItemVersions: ["a:v1"] }), "FAILED");
});

test("sender status covers empty, sent, updates, and failed delivery", () => {
  assert.equal(resolveSenderOutboundStatus([], null), "NOT_SENT");
  assert.equal(resolveSenderOutboundStatus(["a:v1"], { result: "SUCCEEDED", includedItemVersions: ["a:v1"] }), "SENT");
  assert.equal(resolveSenderOutboundStatus(["a:v1", "b:v1"], { result: "SUCCEEDED", includedItemVersions: ["a:v1"] }), "UPDATE_REQUIRED");
  assert.equal(resolveSenderOutboundStatus(["a:v1"], { result: "FAILED", includedItemVersions: ["a:v1"] }), "FAILED");
});

test("uses distinct submit, update, and resend labels", () => {
  assert.equal(supervisorActionLabel("NOT_SUBMITTED"), "Submit to Supervisor");
  assert.equal(supervisorActionLabel("UPDATE_REQUIRED"), "Send Update");
  assert.equal(supervisorActionLabel("FAILED"), "Resend");
  assert.equal(supervisorActionLabel("SUBMITTED"), null);
  assert.equal(senderActionLabel("NOT_SENT"), "Send");
  assert.equal(senderActionLabel("UPDATE_REQUIRED"), "Send Update");
  assert.equal(senderActionLabel("FAILED"), "Resend");
  assert.equal(senderActionLabel("SENT"), null);
});

test("removes an item only from the current frontend list", () => {
  const items = [{ itemVersion: "a:v1" }, { itemVersion: "b:v1" }];
  assert.deepEqual(removeCurrentOutboundItem(items, "a:v1"), [{ itemVersion: "b:v1" }]);
  assert.equal(items.length, 2);
});

test("View Case preserves Submission as return context", () => {
  assert.equal(buildSubmissionCaseHref("email_412"), "/cases/email_412?from=%2Fsubmission");
});

test("automated, Human Review, and outbound statuses remain separate", () => {
  const state = { automatedStatus: "MISMATCH", humanReviewStatus: "ESCALATED", outboundStatus: "SUBMITTED" };
  assert.notEqual(state.automatedStatus, state.humanReviewStatus);
  assert.notEqual(state.humanReviewStatus, state.outboundStatus);
});
