import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { caseAttachmentPath, caseAttachmentProxyPath, fetchTextSource, forwardCaseAttachmentRequest, SourceDocumentError } from "./source-document.ts";
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

test("case attachment proxy retries one transient Inbox 502 and returns the original TXT source", async () => {
  const upstreamUrl = "https://proshipping-nrqg.onrender.com/api/cases/email_004/attachment?filename=attachments%2Femail_004_SI.txt";
  const requested = [];
  const responses = [
    Response.json({ detail: "Inbox service unavailable." }, { status: 502 }),
    new Response("Consignee: EAST BRIGHT FZ-LLC\n", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'inline; filename="email_004_SI.txt"',
      },
    }),
  ];
  const result = await forwardCaseAttachmentRequest(upstreamUrl, async (url, init) => {
    requested.push({ url, cache: init.cache });
    return responses.shift();
  });

  assert.deepEqual(requested, [
    { url: upstreamUrl, cache: "no-store" },
    { url: upstreamUrl, cache: "no-store" },
  ]);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(result.headers.get("content-disposition"), 'inline; filename="email_004_SI.txt"');
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(await result.text(), "Consignee: EAST BRIGHT FZ-LLC\n");
});

test("case attachment proxy does not retry ownership 404 or a successful PDF", async () => {
  for (const upstream of [
    Response.json({ detail: "Attachment not found for this case." }, { status: 404 }),
    new Response(new Uint8Array([37, 80, 68, 70]), { headers: { "Content-Type": "application/pdf" } }),
  ]) {
    let attempts = 0;
    const result = await forwardCaseAttachmentRequest("https://backend.example/attachment", async () => {
      attempts += 1;
      return upstream;
    });
    assert.equal(attempts, 1);
    assert.equal(result.status, upstream.status);
    assert.equal(result.headers.get("content-type"), upstream.headers.get("content-type"));
  }
});

test("case attachment proxy limits persistent Inbox 502 to two attempts", async () => {
  let attempts = 0;
  const result = await forwardCaseAttachmentRequest("https://backend.example/attachment", async () => {
    attempts += 1;
    return Response.json({ detail: "Inbox service unavailable." }, { status: 502 });
  });
  assert.equal(attempts, 2);
  assert.equal(result.status, 502);
  assert.deepEqual(await result.json(), { detail: "Inbox service unavailable." });
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

test("source comparison composes both independently highlighted document panes", async () => {
  const viewer = await readFile(new URL("../components/cases/source-viewer.tsx", import.meta.url), "utf8");
  const actions = await readFile(new URL("../components/cases/source-actions.tsx", import.meta.url), "utf8");
  assert.match(viewer, /file=\{source\.url\}/);
  assert.match(viewer, /SourceDocumentPane side="si"/);
  assert.match(viewer, /SourceDocumentPane side="bl"/);
  assert.match(viewer, /lg:grid-cols-2/);
  assert.match(viewer, /Source Comparison:/);
  assert.match(viewer, /Highlighted \$\{title\} source evidence/);
  assert.match(viewer, /Loading \{title\} text document/);
  assert.match(viewer, /getPdfHighlightRect/);
  assert.match(viewer, /resolveTextHighlight/);
  assert.match(actions, /build\(sourceContext\.siAttachment\)/);
  assert.match(actions, /build\(sourceContext\.blAttachment\)/);
  assert.match(actions, /locator: selectedValue\.source\?\.locator/);
  assert.match(actions, /View Source Comparison/);
  assert.doesNotMatch(actions, /View SI Source/);
  assert.doesNotMatch(actions, /View Draft BL Source/);
  assert.match(actions, /buildHighlight\("si"\)/);
  assert.match(actions, /buildHighlight\("bl"\)/);
  assert.match(actions, /onClose=\{\(\) => setOpen\(false\)\}/);
  assert.doesNotMatch(actions, /comparison\[documentSide\].*filename/);
});

test("source comparison keeps side failures isolated and missing sources visible", async () => {
  const viewer = await readFile(new URL("../components/cases/source-viewer.tsx", import.meta.url), "utf8");
  assert.match(viewer, /function SourceDocumentPane/);
  assert.match(viewer, /Source document unavailable\./);
  assert.match(viewer, /setError\(reason instanceof SourceDocumentError/);
  assert.match(viewer, /source=\{sources\.si\} highlight=\{highlights\.si\}/);
  assert.match(viewer, /source=\{sources\.bl\} highlight=\{highlights\.bl\}/);
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
