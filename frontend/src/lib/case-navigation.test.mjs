import assert from "node:assert/strict";
import test from "node:test";
import { buildCaseDetailHref, getCaseReturnLabel, resolveCaseReturnHref } from "./case-navigation.ts";

test("builds encoded case links with an explicit return destination", () => {
  assert.equal(
    buildCaseDetailHref("email_511", "/cases?status=NEEDS_REVIEW&review_reason=unreadable"),
    "/cases/email_511?from=%2Fcases%3Fstatus%3DNEEDS_REVIEW%26review_reason%3Dunreadable",
  );
});

test("accepts known internal destinations and rejects unsafe return values", () => {
  assert.equal(resolveCaseReturnHref("/inbox"), "/inbox");
  assert.equal(resolveCaseReturnHref("/review"), "/review");
  assert.equal(resolveCaseReturnHref("/cases?status=MISMATCH"), "/cases?status=MISMATCH");
  assert.equal(resolveCaseReturnHref("https://example.com"), "/");
  assert.equal(resolveCaseReturnHref("//example.com/path"), "/");
  assert.equal(resolveCaseReturnHref(["/inbox", "/cases"]), "/");
});

test("creates contextual labels from the validated return destination", () => {
  assert.equal(getCaseReturnLabel("/"), "Back to Dashboard");
  assert.equal(getCaseReturnLabel("/inbox"), "Back to Inbox");
  assert.equal(getCaseReturnLabel("/review"), "Back to Human Review");
  assert.equal(getCaseReturnLabel("/cases?status=MISMATCH"), "Back to Mismatch Cases");
  assert.equal(
    getCaseReturnLabel(
      "/cases?status=NEEDS_REVIEW&review_reason=unreadable",
      (value) => value === "unreadable" ? "Unreadable Document" : undefined,
    ),
    "Back to Unreadable Document Cases",
  );
});
