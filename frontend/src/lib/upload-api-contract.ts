export const compareUploadPath = "/api/compare-upload";
export const compareUploadProxyPath = "/api/manual-upload";

export function uploadComparisonPath(comparisonId: string): string {
  return `/api/upload-comparisons/${encodeURIComponent(comparisonId)}`;
}

export function uploadAttachmentPath(comparisonId: string, role: "si" | "bl"): string {
  return `${uploadComparisonPath(comparisonId)}/attachments/${role}`;
}

export function uploadAttachmentProxyPath(comparisonId: string, role: "si" | "bl"): string {
  return `/api/manual-upload/${encodeURIComponent(comparisonId)}/attachments/${role}`;
}

export function backendErrorDetail(data: unknown): string | null {
  return typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string"
    ? data.detail
    : null;
}

export function uploadHttpFallback(status: number): string {
  if (status === 413) return "The uploaded file exceeds the backend size limit.";
  if (status === 415) return "The selected file format is not supported.";
  if (status === 422) return "The upload request was invalid.";
  if (status >= 500) return "The backend could not process the uploaded documents.";
  return `Upload request failed (HTTP ${status}).`;
}
