import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isBackendHumanReviewStatus,
  isBackendReviewAction,
  isBackendReviewTargetType,
} from "./human-review-contract.ts";

test("accepts REQUEST_INFORMATION, INFORMATION_REQUESTED, and request_reason", async () => {
  assert.equal(isBackendReviewAction("REQUEST_INFORMATION"), true);
  assert.equal(isBackendHumanReviewStatus("INFORMATION_REQUESTED"), true);
  const validator = await readFile(new URL("./human-review-api-validation.ts", import.meta.url), "utf8");
  assert.match(validator, /optionalString\(value\.request_reason\)/);
});

test("accepts backend review contracts for UPLOAD_COMPARISON targets", async () => {
  assert.equal(isBackendReviewTargetType("UPLOAD_COMPARISON"), true);
  const validator = await readFile(new URL("./human-review-api-validation.ts", import.meta.url), "utf8");
  assert.doesNotMatch(validator, /target_type === "COMPETITION_CASE"/);
  assert.match(validator, /isReviewTargetType\(value\.target_type\)/);
});

test("API helpers use current queue parameters, upload review routes, and the case review proxy", async () => {
  const source = await readFile(new URL("./api.ts", import.meta.url), "utf8");
  for (const parameter of ["include_match", "search", "automated_status", "human_review_status", "is_escalated", "retry_requested"]) {
    assert.match(source, new RegExp(parameter));
  }
  for (const helper of ["createUploadReview", "getUploadReviewHistory", "getUploadReviewSummary", "getUploadRetryAttempts", "getUploadEscalations"]) {
    assert.match(source, new RegExp(`function ${helper}`));
  }
  assert.match(source, /request\(`\/api\/case-reviews\/\$\{encodeURIComponent\(emailId\)\}`/);
});
