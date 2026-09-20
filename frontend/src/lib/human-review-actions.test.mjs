import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildCaseReviewRequest,
  getReviewActionAvailability,
  reviewActionDescriptions,
} from "./human-review-actions.ts";

const mismatchCase = {
  email: { email_id: "email_004", from: "ops@example.com", subject: "Draft BL", body: "", attachments: [] },
  category: "BL_COMPARISON",
  status: "MISMATCH",
  si_attachment: "si.pdf",
  bl_attachment: "bl.pdf",
  comparison: [{ field: "gross_weight_kg", status: "mismatch", si: { raw_value: "25000" }, bl: { raw_value: "24500" }, reason: "Different" }],
  review_reason: null,
};

const values = {
  side: "BL",
  correctedValue: "25000",
  note: "Checked source",
  escalationReason: "Weight differs",
  reviewerAction: "Checked both documents",
  requestedDecision: "Approve the correct weight",
  requestReason: "Please confirm the correct gross weight.",
};

test("builds exact backend payloads for every supported review action", () => {
  assert.deepEqual(buildCaseReviewRequest("CONFIRM", "gross_weight_kg", values), { scope: "CASE", action: "CONFIRM" });
  assert.deepEqual(buildCaseReviewRequest("CORRECT", "gross_weight_kg", values), { scope: "FIELD", action: "CORRECT", field: "gross_weight_kg", side: "BL", corrected_value: "25000", note: "Checked source" });
  assert.deepEqual(buildCaseReviewRequest("EQUIVALENT", "gross_weight_kg", values), { scope: "FIELD", action: "EQUIVALENT", field: "gross_weight_kg", side: "BOTH", note: "Checked source" });
  assert.deepEqual(buildCaseReviewRequest("UNREADABLE", "gross_weight_kg", values), { scope: "FIELD", action: "UNREADABLE", field: "gross_weight_kg", side: "BL", note: "Checked source" });
  assert.deepEqual(buildCaseReviewRequest("ADD_NOTE", "gross_weight_kg", values), { scope: "CASE", action: "ADD_NOTE", note: "Checked source" });
  assert.deepEqual(buildCaseReviewRequest("RETRY", "gross_weight_kg", values), { scope: "CASE", action: "RETRY" });
  assert.deepEqual(buildCaseReviewRequest("ESCALATE", "gross_weight_kg", values), { scope: "FIELD", action: "ESCALATE", field: "gross_weight_kg", side: "BOTH", escalation_reason: "Weight differs", reviewer_action: "Checked both documents", requested_decision: "Approve the correct weight", note: "Checked source" });
  assert.deepEqual(buildCaseReviewRequest("REQUEST_INFORMATION", "gross_weight_kg", values), { scope: "FIELD", action: "REQUEST_INFORMATION", field: "gross_weight_kg", side: "BOTH", request_reason: "Please confirm the correct gross weight.", note: "Checked source" });
});

test("enforces field and backend eligibility without inventing review state", () => {
  assert.equal(getReviewActionAvailability(mismatchCase, "CORRECT", null).enabled, false);
  assert.equal(getReviewActionAvailability(mismatchCase, "CORRECT", "gross_weight_kg").enabled, true);
  assert.equal(getReviewActionAvailability(mismatchCase, "EQUIVALENT", "gross_weight_kg").enabled, true);
  assert.equal(getReviewActionAvailability({ ...mismatchCase, status: "FAILED" }, "CONFIRM", "gross_weight_kg").enabled, false);
  assert.equal(getReviewActionAvailability({ ...mismatchCase, status: "MATCH" }, "RETRY", "gross_weight_kg").enabled, false);
});

test("every action has accessible tooltip copy and uses the centralized review API", async () => {
  for (const action of ["CONFIRM", "CORRECT", "EQUIVALENT", "UNREADABLE", "ADD_NOTE", "RETRY", "ESCALATE", "REQUEST_INFORMATION"]) {
    assert.ok(reviewActionDescriptions[action].length > 20);
  }
  const component = await readFile(new URL("../components/review/review-actions.tsx", import.meta.url), "utf8");
  assert.match(component, /role="tooltip"/);
  assert.match(component, /group-hover:block group-focus-within:block/);
  assert.match(component, /createCaseReview/);
  assert.match(component, /router\.refresh\(\)/);
  assert.match(component, /Information or clarification required/);
});
