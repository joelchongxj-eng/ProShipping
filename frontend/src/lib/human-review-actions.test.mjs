import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildCaseReviewRequest,
  getReviewActionAvailability,
  getReviewActionGroups,
  reviewActionLabels,
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

const missingAttachmentCase = {
  ...mismatchCase,
  email: { ...mismatchCase.email, email_id: "email_missing", attachments: [] },
  status: "NEEDS_REVIEW",
  si_attachment: null,
  bl_attachment: null,
  comparison: [],
  review_reason: "missing_attachment",
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
  assert.equal(getReviewActionAvailability(missingAttachmentCase, "REQUEST_INFORMATION", null).enabled, true);
  assert.equal(getReviewActionAvailability(missingAttachmentCase, "ESCALATE", null).enabled, true);
  assert.match(getReviewActionAvailability(missingAttachmentCase, "REQUEST_INFORMATION", null).tooltip, /case-level issue/i);
  assert.match(getReviewActionAvailability(missingAttachmentCase, "ESCALATE", null).tooltip, /case-level issue/i);
  assert.equal(getReviewActionAvailability({ ...missingAttachmentCase, status: "MISMATCH" }, "ESCALATE", null).enabled, false);
  assert.equal(getReviewActionAvailability({ ...missingAttachmentCase, comparison: mismatchCase.comparison }, "REQUEST_INFORMATION", null).enabled, false);
});

test("builds case-scoped follow-up payloads only when no field is selected", () => {
  assert.deepEqual(buildCaseReviewRequest("REQUEST_INFORMATION", null, values), {
    scope: "CASE",
    action: "REQUEST_INFORMATION",
    request_reason: "Please confirm the correct gross weight.",
    note: "Checked source",
  });
  assert.deepEqual(buildCaseReviewRequest("ESCALATE", null, values), {
    scope: "CASE",
    action: "ESCALATE",
    escalation_reason: "Weight differs",
    reviewer_action: "Checked both documents",
    requested_decision: "Approve the correct weight",
    note: "Checked source",
  });
  assert.deepEqual(buildCaseReviewRequest("UNREADABLE", null, { ...values, side: "SI" }), {
    scope: "CASE",
    action: "UNREADABLE",
    side: "SI",
    note: "Checked source",
  });
});

test("groups mismatch decisions and context-aware needs-review actions", () => {
  assert.deepEqual(getReviewActionGroups(mismatchCase, "gross_weight_kg"), {
    primary: ["CONFIRM", "CORRECT", "EQUIVALENT"],
    secondary: ["RETRY", "REQUEST_INFORMATION", "ESCALATE", "UNREADABLE", "ADD_NOTE"],
  });
  assert.deepEqual(getReviewActionGroups(missingAttachmentCase, null), {
    primary: ["REQUEST_INFORMATION"],
    secondary: ["ESCALATE", "ADD_NOTE"],
  });
  assert.deepEqual(getReviewActionGroups({ ...missingAttachmentCase, review_reason: "wrong_doc_type" }, null), {
    primary: ["REQUEST_INFORMATION"],
    secondary: ["ESCALATE", "ADD_NOTE"],
  });
  assert.deepEqual(getReviewActionGroups({ ...missingAttachmentCase, review_reason: "unreadable", si_attachment: "scan.pdf" }, null), {
    primary: ["RETRY"],
    secondary: ["UNREADABLE", "REQUEST_INFORMATION", "ESCALATE", "ADD_NOTE"],
  });
  assert.equal(getReviewActionAvailability({ ...missingAttachmentCase, review_reason: "unreadable", si_attachment: "scan.pdf" }, "UNREADABLE", null).enabled, true);
  assert.deepEqual(getReviewActionGroups({ ...missingAttachmentCase, review_reason: "missing_value" }, null), {
    primary: ["RETRY"],
    secondary: ["REQUEST_INFORMATION", "ESCALATE", "ADD_NOTE"],
  });
});

test("uses the requested human-readable action labels", () => {
  assert.equal(reviewActionLabels.CONFIRM, "Confirm Mismatch");
  assert.equal(reviewActionLabels.CORRECT, "Correct Value");
  assert.equal(reviewActionLabels.EQUIVALENT, "Mark Equivalent");
  assert.equal(reviewActionLabels.REQUEST_INFORMATION, "Request Information");
  assert.equal(reviewActionLabels.ESCALATE, "Escalate");
  assert.equal(reviewActionLabels.RETRY, "Retry");
  assert.equal(reviewActionLabels.UNREADABLE, "Mark Unreadable");
  assert.equal(reviewActionLabels.ADD_NOTE, "Add Note");
});

test("renders eligible actions in two accessible button sections without a dropdown", async () => {
  for (const action of ["CONFIRM", "CORRECT", "EQUIVALENT", "UNREADABLE", "ADD_NOTE", "RETRY", "ESCALATE", "REQUEST_INFORMATION"]) {
    assert.ok(reviewActionDescriptions[action].length > 20);
  }
  const component = await readFile(new URL("../components/review/review-actions.tsx", import.meta.url), "utf8");
  assert.match(component, /role="tooltip"/);
  assert.match(component, /group-hover:block group-focus-within:block/);
  assert.match(component, /createCaseReview/);
  assert.match(component, /router\.refresh\(\)/);
  assert.match(component, /Information or clarification required/);
  assert.match(component, /Review decision/i);
  assert.match(component, /Recommended action/i);
  assert.match(component, /Additional actions/i);
  assert.doesNotMatch(component, /<details|<summary|More Actions/);
  assert.match(component, /action === "UNREADABLE" && selectedField === null/);
});
