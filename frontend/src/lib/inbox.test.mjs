import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterEmails, getClassificationReasonDisplay } from "../components/inbox/inbox-filters.ts";
import { mapBackendCasesToInboxRows } from "./inbox.ts";

function makeCase(emailId, category) {
  return {
    email: {
      email_id: emailId,
      from: "sender@example.com",
      subject: `Subject ${emailId}`,
      body: "Body",
      attachments: [],
    },
    category,
    status: "MATCH",
    comparison: [],
  };
}

test("maps backend cases without inventing received dates or classification confidence", () => {
  const [row] = mapBackendCasesToInboxRows([makeCase("email_001", "GENERAL")]);
  assert.equal(row.classification_reason, null);
  assert.equal("received_at_mock" in row, false);
  assert.equal("classification_confidence_mock" in row, false);
});

test("renders supplied classification reasons and a neutral unavailable fallback", () => {
  assert.equal(getClassificationReasonDisplay("Matched invoice terminology"), "Matched invoice terminology");
  assert.equal(getClassificationReasonDisplay(null), "—");
  assert.equal(getClassificationReasonDisplay("  "), "—");
});

test("category filtering remains independent of removed mock filters", () => {
  const rows = mapBackendCasesToInboxRows([
    makeCase("email_001", "BL_COMPARISON"),
    makeCase("email_002", "GENERAL"),
  ]);
  assert.deepEqual(filterEmails(rows, { category: "all" }).map((row) => row.email_id), ["email_001", "email_002"]);
  assert.deepEqual(filterEmails(rows, { category: "GENERAL" }).map((row) => row.email_id), ["email_002"]);
});

test("Inbox markup exposes Classification Reason and removes mock date and confidence controls", async () => {
  const source = await readFile(new URL("../components/inbox/inbox-queue.tsx", import.meta.url), "utf8");
  assert.match(source, /Classification Reason/);
  assert.doesNotMatch(source, /Received date|All dates|Received \(M\)/);
  assert.doesNotMatch(source, /Classification confidence|All confidence levels|classification_confidence_mock/);
  assert.doesNotMatch(source, /Reset filters|\(M\) = Mock data/);
});
