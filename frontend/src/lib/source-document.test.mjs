import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { caseAttachmentPath, caseAttachmentProxyPath, fetchTextSource, SourceDocumentError } from "./source-document.ts";

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
  assert.match(viewer, /<pre className="whitespace-pre-wrap/);
  assert.match(actions, /build\(sourceContext\.siAttachment\)/);
  assert.match(actions, /build\(sourceContext\.blAttachment\)/);
  assert.match(actions, /onClose=\{\(\) => setSide\(null\)\}/);
  assert.doesNotMatch(actions, /comparison\[documentSide\].*filename/);
});
