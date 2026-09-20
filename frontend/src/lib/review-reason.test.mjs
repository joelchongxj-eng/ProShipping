import assert from "node:assert/strict";
import test from "node:test";
import { getReviewReasonDisplay } from "./review-reason.ts";

test("returns user-friendly Needs Review explanations", () => {
  assert.deepEqual(getReviewReasonDisplay("missing_attachment"), {
    label: "Missing Attachment",
    message: "Required SI or BL attachment is missing.",
  });
  assert.deepEqual(getReviewReasonDisplay("unreadable"), {
    label: "Unreadable Document",
    message: "The document could not be read reliably.",
  });
  assert.deepEqual(getReviewReasonDisplay("wrong_doc_type"), {
    label: "Wrong Document Type",
    message: "The attachment is not a valid SI or Draft BL.",
  });
  assert.deepEqual(getReviewReasonDisplay("missing_value"), {
    label: "Missing Value",
    message: "One or more required fields could not be extracted.",
  });
  assert.deepEqual(getReviewReasonDisplay("low_confidence_extraction"), {
    label: "Low-confidence Extraction",
    message: "One or more document fields could not be read with sufficient confidence.",
  });
});

test("returns an honest fallback when no review reason is supplied", () => {
  assert.deepEqual(getReviewReasonDisplay(null), {
    label: "Review required",
    message: "This case requires human review before it can be completed.",
  });
});
