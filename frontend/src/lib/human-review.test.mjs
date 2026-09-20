import assert from "node:assert/strict";
import test from "node:test";
import { filterReviewQueue, humanReviewStatuses, summarizeReviewQueue } from "./human-review.ts";

function reviewCase(emailId, subject, status, humanReviewStatus = "PENDING") {
  return {
    target_type: "COMPETITION_CASE",
    target_id: emailId,
    email_id: emailId,
    sender: "review@example.com",
    subject,
    received_at: null,
    automated_status: status,
    review_reason: null,
    human_review_status: humanReviewStatus,
    last_reviewed_at: null,
    is_escalated: humanReviewStatus === "ESCALATED",
    active_escalation_reason: null,
    latest_email_delivery_status: null,
    retry_requested: humanReviewStatus === "RETRY_REQUESTED",
    latest_retry_execution_status: null,
    latest_retry_attempt_number: null,
    has_human_review: humanReviewStatus !== "PENDING",
    latest_review_action: null,
    latest_review_id: null,
  };
}

const cases = [
  reviewCase("email_001", "Container discrepancy", "MISMATCH"),
  reviewCase("email_002", "Unreadable draft", "NEEDS_REVIEW"),
  reviewCase("email_003", "Complete match", "MATCH"),
];

test("declares the complete backend Human Review status contract", () => {
  assert.deepEqual(humanReviewStatuses, [
    "PENDING",
    "IN_REVIEW",
    "CONFIRMED",
    "CORRECTED",
    "ACCEPTED_EQUIVALENT",
    "UNREADABLE",
    "RETRY_REQUESTED",
    "ESCALATED",
    "INFORMATION_REQUESTED",
  ]);
});

test("filters independently by automated status and search text", () => {
  assert.deepEqual(filterReviewQueue(cases, "MISMATCH", "ALL", "").map((item) => item.email_id), ["email_001"]);
  assert.deepEqual(filterReviewQueue(cases, "ALL", "ALL", "unreadable").map((item) => item.email_id), ["email_002"]);
  assert.deepEqual(filterReviewQueue(cases, "ALL", "ALL", "EMAIL_001").map((item) => item.email_id), ["email_001"]);
});

test("combines automated status, Human Review status, and search without inferring missing status", () => {
  const reviewCases = [
    reviewCase("email_101", "Confirmed mismatch", "MISMATCH", "CONFIRMED"),
    reviewCase("email_102", "Corrected weight", "MISMATCH", "CORRECTED"),
    reviewCase("email_103", "Escalated scan", "NEEDS_REVIEW", "ESCALATED"),
    reviewCase("email_104", "Pending mismatch", "MISMATCH"),
    reviewCase("email_105", "Information needed", "NEEDS_REVIEW", "INFORMATION_REQUESTED"),
  ];

  assert.deepEqual(filterReviewQueue(reviewCases, "MISMATCH", "ALL", "").map((item) => item.email_id), ["email_101", "email_102", "email_104"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "ALL", "CONFIRMED", "").map((item) => item.email_id), ["email_101"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "MISMATCH", "CORRECTED", "").map((item) => item.email_id), ["email_102"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "NEEDS_REVIEW", "ESCALATED", "").map((item) => item.email_id), ["email_103"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "MISMATCH", "CORRECTED", "weight").map((item) => item.email_id), ["email_102"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "ALL", "PENDING", "").map((item) => item.email_id), ["email_104"]);
  assert.deepEqual(filterReviewQueue(reviewCases, "ALL", "INFORMATION_REQUESTED", "").map((item) => item.email_id), ["email_105"]);
});

test("summarizes automated statuses without creating Human Review state", () => {
  assert.deepEqual(summarizeReviewQueue(cases), {
    total: 3,
    mismatch: 1,
    needsReview: 1,
  });
});
