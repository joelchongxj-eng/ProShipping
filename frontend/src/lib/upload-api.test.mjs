import assert from "node:assert/strict";
import test from "node:test";
import {
  backendErrorDetail,
  compareUploadPath,
  uploadAttachmentPath,
  uploadComparisonPath,
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

test("builds role-specific upload attachment URLs", () => {
  assert.equal(uploadAttachmentPath("comparison_123", "si"), "/api/upload-comparisons/comparison_123/attachments/si");
  assert.equal(uploadAttachmentPath("comparison_123", "bl"), "/api/upload-comparisons/comparison_123/attachments/bl");
});
