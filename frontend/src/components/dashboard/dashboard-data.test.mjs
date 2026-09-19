import assert from "node:assert/strict";
import test from "node:test";
import { groupCases } from "./dashboard-data.ts";

function makeCase({ emailId, status, fieldStatus = "match", reviewReason = null }) {
  return {
    email: {
      email_id: emailId,
      from: "operations@example.com",
      subject: "Shipping document verification",
      body: "",
      attachments: [],
    },
    category: "BL_COMPARISON",
    status,
    comparison: [{ field: "shipper", status: fieldStatus, si: null, bl: null, reason: "Test fixture" }],
    review_reason: reviewReason,
  };
}

test("groups cases by authoritative case status", () => {
  const matched = makeCase({ emailId: "matched", status: "MATCH" });
  const mismatchWithMissingField = makeCase({ emailId: "mismatch", status: "MISMATCH", fieldStatus: "missing" });
  const needsReviewMissingValue = makeCase({ emailId: "missing-value", status: "NEEDS_REVIEW", fieldStatus: "missing", reviewReason: "missing_value" });
  const needsReviewUnreadable = makeCase({ emailId: "unreadable", status: "NEEDS_REVIEW", reviewReason: "unreadable" });
  const failed = makeCase({ emailId: "failed", status: "FAILED", fieldStatus: "missing" });

  const groups = groupCases([matched, mismatchWithMissingField, needsReviewMissingValue, needsReviewUnreadable, failed]);

  assert.deepEqual(groups.matched.map((item) => item.email.email_id), ["matched"]);
  assert.deepEqual(groups.mismatch.map((item) => item.email.email_id), ["mismatch"]);
  assert.deepEqual(groups.needs_review.map((item) => item.email.email_id), ["missing-value", "unreadable"]);
  assert.deepEqual(groups.failed.map((item) => item.email.email_id), ["failed"]);
});

test("limits Missing Information to missing attachment or missing value review reasons", () => {
  const cases = [
    makeCase({ emailId: "mismatch", status: "MISMATCH", fieldStatus: "missing" }),
    makeCase({ emailId: "missing-attachment", status: "NEEDS_REVIEW", reviewReason: "missing_attachment" }),
    makeCase({ emailId: "missing-value", status: "NEEDS_REVIEW", reviewReason: "missing_value" }),
    makeCase({ emailId: "unreadable", status: "NEEDS_REVIEW", reviewReason: "unreadable" }),
    makeCase({ emailId: "wrong-doc", status: "NEEDS_REVIEW", reviewReason: "wrong_doc_type" }),
  ];

  assert.deepEqual(groupCases(cases).missing_information.map((item) => item.email.email_id), ["missing-attachment", "missing-value"]);
});
