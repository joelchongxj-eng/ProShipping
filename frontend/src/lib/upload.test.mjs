import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUploadResultHref,
  createUploadFormData,
  defaultMaxUploadBytes,
  validateUploadSelection,
} from "./upload.ts";

function file(name, content = "document") {
  return new File([content], name);
}

test("validates required SI and Draft BL files", () => {
  assert.deepEqual(validateUploadSelection(null, null), {
    si: "Shipping Instruction file is required.",
    bl: "Draft Bill of Lading file is required.",
  });
});

test("rejects unsupported, empty, and oversized files", () => {
  assert.match(validateUploadSelection(file("si.csv"), file("bl.txt")).si, /PDF, TXT, DOCX, or XLSX/);
  assert.equal(validateUploadSelection(file("si.txt", ""), file("bl.txt")).si, "Shipping Instruction file is empty.");
  const oversized = new File([new Uint8Array(defaultMaxUploadBytes + 1)], "bl.pdf");
  assert.equal(validateUploadSelection(file("si.txt"), oversized).bl, "Draft Bill of Lading exceeds the 10 MB upload limit.");
});

test("creates multipart data with separate backend field names", () => {
  const si = file("si.txt");
  const bl = file("bl.txt");
  const body = createUploadFormData(si, bl);
  assert.equal(body.get("si_file"), si);
  assert.equal(body.get("bl_file"), bl);
  assert.equal(body.get("email_id"), null);
});

test("builds a dedicated upload result route from comparison_id", () => {
  assert.equal(buildUploadResultHref("comparison/123"), "/upload/comparison%2F123");
  assert.equal(buildUploadResultHref("comparison_123").startsWith("/cases/"), false);
});
