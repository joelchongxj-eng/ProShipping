import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterEmails } from "../components/inbox/inbox-filters.ts";
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
  assert.equal("classification_reason" in row, false);
  assert.equal("received_at_mock" in row, false);
  assert.equal("classification_confidence_mock" in row, false);
});

test("category filtering remains independent of removed mock filters", () => {
  const rows = mapBackendCasesToInboxRows([
    makeCase("email_001", "BL_COMPARISON"),
    makeCase("email_002", "GENERAL"),
  ]);
  assert.deepEqual(filterEmails(rows, { category: "all" }).map((row) => row.email_id), ["email_001", "email_002"]);
  assert.deepEqual(filterEmails(rows, { category: "GENERAL" }).map((row) => row.email_id), ["email_002"]);
});

test("Inbox markup keeps the core columns and removes unsupported fields", async () => {
  const source = await readFile(new URL("../components/inbox/inbox-queue.tsx", import.meta.url), "utf8");
  const summary = await readFile(new URL("../components/inbox/email-summary.tsx", import.meta.url), "utf8");
  for (const heading of ["Email ID", "Sender", "Subject", "Category", "Action"]) assert.match(source, new RegExp(`"${heading}"`));
  assert.doesNotMatch(source, /Classification Reason|classification_reason/);
  assert.doesNotMatch(summary, /Classification reason|classification_reason/);
  assert.doesNotMatch(source, /Received date|All dates|Received \(M\)/);
  assert.doesNotMatch(source, /Classification confidence|All confidence levels|classification_confidence_mock/);
  assert.doesNotMatch(source, /Reset filters|\(M\) = Mock data/);
});
