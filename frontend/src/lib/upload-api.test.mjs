import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  backendErrorDetail,
  compareUploadPath,
  compareUploadProxyPath,
  uploadAttachmentPath,
  uploadAttachmentProxyPath,
  uploadComparisonPath,
  uploadHttpFallback,
} from "./upload-api-contract.ts";
import { isUploadComparisonResponse } from "./api-validation.ts";

const validUploadResponse = {
  comparison_id: "comparison_123",
  status: "MATCH",
  review_reason: null,
  si_file: { filename: "si.txt", source_filename: "uploads/comparison_123/si/si.txt", attachment_url: "/api/upload-comparisons/comparison_123/attachments/si" },
  bl_file: { filename: "bl.txt", source_filename: "uploads/comparison_123/bl/bl.txt", attachment_url: "/api/upload-comparisons/comparison_123/attachments/bl" },
  si_fields: null,
  bl_fields: null,
  comparison: [],
};

test("defines POST and reload paths around comparison_id", () => {
  assert.equal(compareUploadPath, "/api/compare-upload");
  assert.equal(compareUploadProxyPath, "/api/manual-upload");
  assert.equal(uploadComparisonPath("comparison_123"), "/api/upload-comparisons/comparison_123");
  assert.equal(uploadComparisonPath("comparison/123"), "/api/upload-comparisons/comparison%2F123");
  assert.equal(uploadComparisonPath("comparison_123").includes("email"), false);
});

test("accepts a backend-shaped successful upload response", () => {
  assert.equal(isUploadComparisonResponse(validUploadResponse), true);
  assert.equal(isUploadComparisonResponse({ ...validUploadResponse, comparison_id: "" }), false);
});

test("extracts safe backend detail messages used by 400, 413, and 404 errors", () => {
  assert.equal(backendErrorDetail({ detail: "Unsupported SI file type." }), "Unsupported SI file type.");
  assert.equal(backendErrorDetail({ detail: "SI file exceeds the upload size limit." }), "SI file exceeds the upload size limit.");
  assert.equal(backendErrorDetail({ detail: "Upload comparison not found." }), "Upload comparison not found.");
  assert.equal(backendErrorDetail({ detail: ["private", "validation"] }), null);
});

test("provides distinct upload fallbacks for validation and processing errors", () => {
  assert.equal(uploadHttpFallback(422), "The upload request was invalid.");
  assert.equal(uploadHttpFallback(500), "The backend could not process the uploaded documents.");
  assert.equal(uploadHttpFallback(413), "The uploaded file exceeds the backend size limit.");
});

test("builds role-specific upload attachment URLs", () => {
  assert.equal(uploadAttachmentPath("comparison_123", "si"), "/api/upload-comparisons/comparison_123/attachments/si");
  assert.equal(uploadAttachmentPath("comparison_123", "bl"), "/api/upload-comparisons/comparison_123/attachments/bl");
  assert.equal(uploadAttachmentProxyPath("comparison_123", "si"), "/api/manual-upload/comparison_123/attachments/si");
  assert.equal(uploadAttachmentProxyPath("comparison_123", "bl"), "/api/manual-upload/comparison_123/attachments/bl");
});

test("upload client uses the same-origin proxy without setting a multipart content type", async () => {
  const api = await readFile(new URL("./api.ts", import.meta.url), "utf8");
  assert.match(api, /request\(compareUploadProxyPath/);
  assert.match(api, /body: createUploadFormData\(siFile, blFile\)/);
  assert.doesNotMatch(api, /compareUploadProxyPath[\s\S]{0,250}Content-Type/);
});
