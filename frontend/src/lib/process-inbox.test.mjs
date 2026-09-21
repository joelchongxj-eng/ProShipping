import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { forwardProcessInboxRequest, isProcessInboxResponse } from "./process-inbox.ts";

test("validates only the backend processed and status_counts response shape", () => {
  assert.equal(isProcessInboxResponse({ processed: 3, status_counts: { MATCH: 1, MISMATCH: 2 } }), true);
  assert.equal(isProcessInboxResponse({ processed: 3, status_counts: {} }), true);
  assert.equal(isProcessInboxResponse({ processed: 3, status_counts: { MATCH: -1 } }), false);
  assert.equal(isProcessInboxResponse({ processed: 3, status_counts: { MATCH: "1" } }), false);
  assert.equal(isProcessInboxResponse({ processed: 3, success_count: 3 }), false);
});

test("process proxy posts without a request body and returns successful JSON", async () => {
  let receivedUrl = "";
  let receivedInit;
  const response = await forwardProcessInboxRequest("http://backend/api/process-all", async (url, init) => {
    receivedUrl = String(url);
    receivedInit = init;
    return Response.json({ processed: 2, status_counts: { MATCH: 2 } });
  });
  assert.equal(receivedUrl, "http://backend/api/process-all");
  assert.equal(receivedInit.method, "POST");
  assert.equal("body" in receivedInit, false);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { processed: 2, status_counts: { MATCH: 2 } });
});

test("process proxy returns safe errors for inbox, server, and network failures", async () => {
  const inbox = await forwardProcessInboxRequest("http://backend/api/process-all", async () => Response.json({ detail: "private upstream detail" }, { status: 502 }));
  assert.equal(inbox.status, 502);
  assert.deepEqual(await inbox.json(), { detail: "Inbox service unavailable." });

  const server = await forwardProcessInboxRequest("http://backend/api/process-all", async () => new Response("traceback", { status: 500 }));
  assert.equal(server.status, 500);
  assert.deepEqual(await server.json(), { detail: "Inbox processing failed." });

  const network = await forwardProcessInboxRequest("http://backend/api/process-all", async () => { throw new TypeError("connect refused"); });
  assert.equal(network.status, 502);
  assert.deepEqual(await network.json(), { detail: "Unable to connect to the backend." });
});

test("Inbox keeps server rendering and delegates processing interaction to a focused client component", async () => {
  const page = await readFile(new URL("../app/inbox/page.tsx", import.meta.url), "utf8");
  const button = await readFile(new URL("../components/inbox/process-inbox-button.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("./api.ts", import.meta.url), "utf8");

  assert.doesNotMatch(page, /^"use client"/);
  assert.match(page, /<ProcessInboxButton \/>/);
  assert.doesNotMatch(page, /Run .*POST \/api\/process-all/);
  assert.match(button, /disabled=\{isProcessing\}/);
  assert.match(button, /processing\.current/);
  assert.match(button, /Processing\.\.\./);
  assert.match(button, /router\.refresh\(\)/);
  assert.match(button, /result\.processed/);
  assert.match(button, /Object\.entries\(result\.status_counts\)/);
  assert.match(button, /role="status"/);
  assert.match(button, /role="alert"/);
  assert.match(api, /request\(processInboxProxyPath, \{ method: "POST" \}/);
});
