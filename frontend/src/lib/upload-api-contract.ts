export const compareUploadPath = "/api/compare-upload";

export function uploadComparisonPath(comparisonId: string): string {
  return `/api/upload-comparisons/${encodeURIComponent(comparisonId)}`;
}

export function uploadAttachmentPath(comparisonId: string, role: "si" | "bl"): string {
  return `${uploadComparisonPath(comparisonId)}/attachments/${role}`;
}

export function backendErrorDetail(data: unknown): string | null {
  return typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string"
    ? data.detail
    : null;
}
