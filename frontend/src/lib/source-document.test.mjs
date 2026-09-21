import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { caseAttachmentPath, caseAttachmentProxyPath, fetchTextSource, SourceDocumentError } from "./source-document.ts";
import { getPdfHighlightRect, resolveTextHighlight } from "./source-locator.ts";

test("case source URLs preserve the backend-owned attachment path for SI and Draft BL", () => {
  const si = caseAttachmentPath("email_004", "attachments/email_004_SI.txt");
  const bl = caseAttachmentPath("email_004", "attachments/email_004_BL.txt");
  assert.equal(si, "/api/cases/email_004/attachment?filename=attachments%2Femail_004_SI.txt");
  assert.equal(bl, "/api/cases/email_004/attachment?filename=attachments%2Femail_004_BL.txt");
  assert.equal(new URLSearchParams(si.split("?")[1]).get("filename"), "attachments/email_004_SI.txt");
});

test("browser source URLs use the same-origin proxy and preserve the full attachment path", () => {
  const url = caseAttachmentProxyPath("email_004", "attachments/email_004_BL.txt");
  assert.equal(url, "/api/case-attachments/email_004?filename=attachments%2Femail_004_BL.txt");
  assert.equal(new URLSearchParams(url.split("?")[1]).get("filename"), "attachments/email_004_BL.txt");
});

test("TXT 200 responses return the original text with line breaks", async () => {
  const value = await fetchTextSource("http://backend/source", async () => new Response("LINE 1\nLINE 2\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } }));
  assert.equal(value, "LINE 1\nLINE 2\n");
});

test("TXT errors distinguish missing, invalid, server, network, and malformed responses", async () => {
  const expected = [
    [404, "Source file could not be found."],
    [422, "Source file request is invalid."],
    [500, "Source file could not be loaded."],
    [502, "Source file could not be loaded."],
  ];
  for (const [status, message] of expected) {
    await assert.rejects(() => fetchTextSource("http://backend/source", async () => new Response("", { status })), (error) => error instanceof SourceDocumentError && error.message === message);
  }
  await assert.rejects(() => fetchTextSource("http://backend/source", async () => { throw new TypeError("fetch failed"); }), /Unable to connect to the backend/);
  await assert.rejects(() => fetchTextSource("http://backend/source", async () => new Response("<html>wrong response</html>", { headers: { "Content-Type": "text/html" } })), /unsupported response/);
  await assert.rejects(() => fetchTextSource("http://backend/source", async () => ({ ok: true, status: 200, headers: new Headers({ "Content-Type": "text/plain" }), text: async () => { throw new Error("decode"); } })), /could not be read/);
});

test("shared viewer keeps PDF behavior and reopens SI or BL from case metadata", async () => {
  const viewer = await readFile(new URL("../components/cases/source-viewer.tsx", import.meta.url), "utf8");
  const actions = await readFile(new URL("../components/cases/source-actions.tsx", import.meta.url), "utf8");
  assert.match(viewer, /file=\{source\.url\}/);
  assert.match(viewer, /Highlighted source evidence/);
  assert.match(viewer, /getPdfHighlightRect/);
  assert.match(viewer, /resolveTextHighlight/);
  assert.match(actions, /build\(sourceContext\.siAttachment\)/);
  assert.match(actions, /build\(sourceContext\.blAttachment\)/);
  assert.match(actions, /locator: selectedValue\.source\?\.locator/);
  assert.match(actions, /onClose=\{\(\) => setSide\(null\)\}/);
  assert.doesNotMatch(actions, /comparison\[documentSide\].*filename/);
});

test("TXT locator highlights the exact line-relative character range", () => {
  const text = "Shipper: ACME\r\nGross Weight: 21,577 KG\r\nPort: Klang";
  const range = resolveTextHighlight(text, { kind: "txt", line_number: 2, start_char: 14, end_char: 23 }, null);
  assert.ok(range);
  assert.equal(range.lineNumber, 2);
  assert.equal(text.slice(range.start, range.end), "21,577 KG");
});

test("TXT evidence fallback requires one exact unambiguous occurrence", () => {
  const exact = resolveTextHighlight("Header\nGross Weight: 20,000 KG", null, "Gross Weight: 20,000 KG");
  assert.equal(exact?.lineNumber, 2);
  assert.equal(resolveTextHighlight("VALUE\nVALUE", null, "VALUE"), null);
  assert.equal(resolveTextHighlight("No evidence", null, null), null);
});

test("PDF bbox scales from backend page coordinates without inventing a rectangle", () => {
  const locator = { kind: "pdf", page: 2, bbox: { x0: 10, y0: 20, x1: 60, y1: 40 } };
  assert.deepEqual(getPdfHighlightRect(locator, 100, 200), { left: 20, top: 40, width: 100, height: 40 });
  assert.equal(getPdfHighlightRect({ ...locator, bbox: { x0: 10, y0: 20, x1: 10, y1: 40 } }, 100, 200), null);
});
