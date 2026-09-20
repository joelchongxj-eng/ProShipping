import assert from "node:assert/strict";
import test from "node:test";
import { filterReviewQueue, humanReviewStatuses, isReviewQueueCase, summarizeReviewQueue } from "./human-review.ts";

function reviewCase(emailId, subject, status, category = "BL_COMPARISON", humanReviewStatus) {
  return {
    email: { email_id: emailId, from: "review@example.com", subject, body: "", attachments: [] },
    category,
    status,
    comparison: [],
    ...(humanReviewStatus ? { human_review_status: humanReviewStatus } : {}),
  };
}

const cases = [
  reviewCase("email_001", "Container discrepancy", "MISMATCH"),
  reviewCase("email_002", "Unreadable draft", "NEEDS_REVIEW"),
  reviewCase("email_003", "Complete match", "MATCH"),
  reviewCase("email_004", "Invoice question", "MISMATCH", "INVOICE_QUERY"),
];

test("keeps only backend BL comparison cases requiring attention", () => {
  assert.deepEqual(cases.filter(isReviewQueueCase).map((item) => item.email.email_id), ["email_001", "email_002"]);
});

test("declares the complete planned Human Review status contract", () => {
  assert.deepEqual(humanReviewStatuses, [
    "PENDING",
    "IN_REVIEW",
    "CONFIRMED",
    "CORRECTED",
    "ACCEPTED_EQUIVALENT",
    "UNREADABLE",
    "RETRY_REQUESTED",
    "ESCALATED",
  ]);
});

test("filters independently by automated status and search text", () => {
  const queue = cases.filter(isReviewQueueCase);
  assert.deepEqual(filterReviewQueue(queue, "MISMATCH", "ALL", "").map((item) => item.email.email_id), ["email_001"]);
  assert.deepEqual(filterReviewQueue(queue, "ALL", "ALL", "unreadable").map((item) => item.email.email_id), ["email_002"]);
  assert.deepEqual(filterReviewQueue(queue, "ALL", "ALL", "EMAIL_001").map((item) => item.email.email_id), ["email_001"]);
});

test("combines automated status, Human Review status, and search without inferring missing status", () => {
  const reviewCases = [
    reviewCase("email_101", "Confirmed mismatch", "MISMATCH", "BL_COMPARISON", "CONFIRMED"),
    reviewCase("email_102", "Corrected weight", "MISMATCH", "BL_COMPARISON", "CORRECTED"),
    reviewCase("email_103", "Escalated scan", "NEEDS_REVIEW", "BL_COMPARISON", "ESCALATED"),
    reviewCase("email_104", "Pending mismatch", "MISMATCH"),
  ];

  assert.deepEqual(filterReviewQueue(reviewCases, "MISMATCH", "ALL", "").map((item) => item.email.email_id), ["email_101", "email_102", "email_104"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "ALL", "CONFIRMED", "").map((item) => item.email.email_id), ["email_101"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "MISMATCH", "CORRECTED", "").map((item) => item.email.email_id), ["email_102"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "NEEDS_REVIEW", "ESCALATED", "").map((item) => item.email.email_id), ["email_103"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "MISMATCH", "CORRECTED", "weight").map((item) => item.email.email_id), ["email_102"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "ALL", "PENDING", "").map((item) => item.email.email_id), []);
});

test("summarizes automated statuses without creating Human Review state", () => {
  assert.deepEqual(summarizeReviewQueue(cases.filter(isReviewQueueCase)), {
    total: 2,
    mismatch: 1,
    needsReview: 1,
  });
});
