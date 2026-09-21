import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { settleCaseHumanReviewData, usesHumanReviewWorkflow } from "./case-detail-data.ts";
import { comparisonMethodLabels, formatSourceLocator } from "./source-locator.ts";

const target = { target_type: "COMPETITION_CASE", target_id: "email_004" };

test("secondary endpoint failure remains isolated from other Case Detail data", async () => {
  const data = await settleCaseHumanReviewData("email_004", {
    summary: async () => ({ ...target, automated_status: "MISMATCH", review_status: "PENDING", is_escalated: false, escalation_reason: null, escalated_at: null, latest_review: null, case_review: null, field_reviews: [], effective_values: {}, review_count: 0 }),
    history: async () => { throw new Error("offline"); },
    retries: async () => ({ ...target, attempts: [] }),
    escalations: async () => ({ ...target, assignments: [] }),
  });
  assert.equal(data.summary.review_status, "PENDING");
  assert.equal(data.history, null);
  assert.equal(data.errors.history, "Review history could not be loaded.");
  assert.deepEqual(data.retries.attempts, []);
  assert.deepEqual(data.escalations.assignments, []);
});

test("formats every backend source locator without inventing page numbers", () => {
  const field = (locator) => ({ source: { filename: "source", evidence_text: "evidence", locator } });
  assert.equal(formatSourceLocator(field({ kind: "txt", line_number: 14, start_char: 0, end_char: 5 })), "TXT line 14");
  assert.equal(formatSourceLocator(field({ kind: "pdf", page: 2, bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } })), "PDF page 2");
  assert.equal(formatSourceLocator(field({ kind: "xlsx", sheet_name: "Sheet1", cell_address: "B7" })), "XLSX Sheet1!B7");
  assert.equal(formatSourceLocator(field({ kind: "docx", paragraph_index: null, table_index: 0, row_index: 2, cell_index: 1 })), "DOCX table 1, row 3, cell 2");
  assert.equal(formatSourceLocator({ source: null, page: null }), null);
  assert.equal(comparisonMethodLabels.SEMANTIC_RULE, "Semantic rule");
});

test("Dashboard and Case Detail remove receipt metadata and keep important case information", async () => {
  const casePage = await readFile(new URL("../app/cases/[emailId]/page.tsx", import.meta.url), "utf8");
  const dashboardRow = await readFile(new URL("../components/dashboard/case-row.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(casePage, /Received|received_at|Not supplied by backend/);
  assert.doesNotMatch(dashboardRow, /Received|received_at/);
  for (const label of ["Sender", "Category", "Automated Status", "Review Reason", "Human Review", "Active Escalation"]) assert.match(casePage, new RegExp(label));
  assert.match(dashboardRow, /item\.email\.from/);
  assert.match(dashboardRow, /buildCaseDetailHref/);
});

test("Case Detail uses live review sections and comparison metadata without stale integration messages", async () => {
  const panel = await readFile(new URL("../components/review/human-review-panel.tsx", import.meta.url), "utf8");
  const comparison = await readFile(new URL("../components/cases/comparison-result.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(panel, /Unavailable from current backend|Person B|no review-summary|No review-history endpoint/);
  for (const label of ["Review Summary", "Review History", "Retry History", "Escalation History", "Effective Values"]) assert.match(panel, new RegExp(label));
  assert.match(comparison, /comparison_method/);
  assert.match(comparison, /equivalence_reason/);
});

test("comparison rows use explicit backend status treatments and emphasize mismatch values", async () => {
  const comparison = await readFile(new URL("../components/cases/comparison-result.tsx", import.meta.url), "utf8");
  assert.match(comparison, /item\.status === "mismatch"/);
  assert.match(comparison, /bg-red-50/);
  assert.match(comparison, /bg-yellow-50/);
  assert.match(comparison, /bg-gray-100/);
  assert.match(comparison, /bg-green-50/);
  assert.match(comparison, /emphasized=\{item\.status === "mismatch"\}/);
  assert.match(comparison, /<StatusBadge status=\{item\.status\}/);
});

test("matched cases omit Human Review while all comparison results remain available", async () => {
  assert.equal(usesHumanReviewWorkflow("MATCH"), false);
  assert.equal(usesHumanReviewWorkflow("MISMATCH"), true);
  assert.equal(usesHumanReviewWorkflow("NEEDS_REVIEW"), true);
  assert.equal(usesHumanReviewWorkflow("FAILED"), true);
  const casePage = await readFile(new URL("../app/cases/[emailId]/page.tsx", import.meta.url), "utf8");
  assert.match(casePage, /showHumanReview/);
  assert.match(casePage, /CaseComparison/);
  assert.match(casePage, /CaseReviewWorkspace/);
});
