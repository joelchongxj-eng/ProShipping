import assert from "node:assert/strict";
import test from "node:test";
import { countReviewReasons, filterCases, groupCases, groupReviewReasonCases, resolveCaseFilter } from "./dashboard-data.ts";

function makeCase({ emailId, status, reviewReason = null, category = "BL_COMPARISON" }) {
  return {
    email: { email_id: emailId, from: "operations@example.com", subject: "Verification", body: "", attachments: [] },
    category,
    status,
    comparison: [],
    review_reason: reviewReason,
  };
}

const cases = [
  makeCase({ emailId: "matched", status: "MATCH" }),
  makeCase({ emailId: "mismatch", status: "MISMATCH" }),
  makeCase({ emailId: "missing-attachment", status: "NEEDS_REVIEW", reviewReason: "missing_attachment" }),
  makeCase({ emailId: "missing-value", status: "NEEDS_REVIEW", reviewReason: "missing_value" }),
  makeCase({ emailId: "unreadable", status: "NEEDS_REVIEW", reviewReason: "unreadable" }),
  makeCase({ emailId: "wrong-doc", status: "NEEDS_REVIEW", reviewReason: "wrong_doc_type" }),
  makeCase({ emailId: "unspecified", status: "NEEDS_REVIEW" }),
  makeCase({ emailId: "failed", status: "FAILED" }),
];

test("uses four authoritative top-level case statuses", () => {
  const groups = groupCases(cases);
  assert.deepEqual(Object.keys(groups), ["matched", "mismatch", "needs_review", "failed"]);
  assert.equal(groups.needs_review.length, 5);
  assert.equal(groups.failed.length, 1);
});

test("Dashboard counts and groups only BL comparison cases", () => {
  const allCases = [
    makeCase({ emailId: "comparison", status: "MISMATCH" }),
    makeCase({ emailId: "invoice", status: "MATCH", category: "INVOICE_QUERY" }),
    makeCase({ emailId: "general", status: "MATCH", category: "GENERAL" }),
  ];

  const groups = groupCases(allCases);

  assert.equal(Object.values(groups).flat().length, 1);
  assert.deepEqual(groups.matched, []);
  assert.deepEqual(groups.mismatch.map((item) => item.email.email_id), ["comparison"]);
});

test("Cases filters exclude non-BL-comparison records", () => {
  const allCases = [
    makeCase({ emailId: "comparison", status: "MATCH" }),
    makeCase({ emailId: "invoice", status: "MATCH", category: "INVOICE_QUERY" }),
  ];

  assert.deepEqual(filterCases(allCases, { group: "all" }).map((item) => item.email.email_id), ["comparison"]);
  assert.deepEqual(filterCases(allCases, { group: "matched" }).map((item) => item.email.email_id), ["comparison"]);
});

test("counts only backend-supplied review reasons", () => {
  assert.deepEqual(countReviewReasons(cases), {
    missing_attachment: 1,
    missing_value: 1,
    unreadable: 1,
    wrong_doc_type: 1,
  });
});

test("groups preview cases by backend-supplied review reason", () => {
  const groups = groupReviewReasonCases(cases);
  assert.deepEqual(groups.missing_attachment.map((item) => item.email.email_id), ["missing-attachment"]);
  assert.equal(Object.values(groups).flat().some((item) => item.email.email_id === "unspecified"), false);
});

test("supports overall status and review reason filters", () => {
  const allReview = resolveCaseFilter({ status: "NEEDS_REVIEW" });
  const missing = resolveCaseFilter({ status: "NEEDS_REVIEW", review_reason: "missing_attachment" });
  assert.notEqual(allReview, "invalid");
  assert.notEqual(missing, "invalid");
  assert.equal(filterCases(cases, allReview).length, 5);
  assert.deepEqual(filterCases(cases, missing).map((item) => item.email.email_id), ["missing-attachment"]);
  assert.deepEqual(resolveCaseFilter({ status: "mismatch" }), { group: "mismatch", reviewReason: undefined });
  assert.equal(resolveCaseFilter({ review_reason: "missing_value" }), "invalid");
  assert.equal(resolveCaseFilter({ status: "NEEDS_REVIEW", review_reason: "unknown" }), "invalid");
});
