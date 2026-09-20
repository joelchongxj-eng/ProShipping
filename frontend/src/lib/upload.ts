export const supportedUploadExtensions = [".pdf", ".txt", ".docx", ".xlsx"] as const;
export const defaultMaxUploadBytes = 10 * 1024 * 1024;

export type UploadRole = "si" | "bl";

export interface UploadValidationErrors {
  si?: string;
  bl?: string;
}

function extensionFor(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLocaleLowerCase() : "";
}

export function validateUploadFile(file: File | null, role: UploadRole): string | undefined {
  const label = role === "si" ? "Shipping Instruction" : "Draft Bill of Lading";
  if (!file) return `${label} file is required.`;
  if (!supportedUploadExtensions.includes(extensionFor(file.name) as (typeof supportedUploadExtensions)[number])) {
    return `${label} must be a PDF, TXT, DOCX, or XLSX file.`;
  }
  if (file.size === 0) return `${label} file is empty.`;
  if (file.size > defaultMaxUploadBytes) return `${label} exceeds the 10 MB upload limit.`;
  return undefined;
}

export function validateUploadSelection(siFile: File | null, blFile: File | null): UploadValidationErrors {
  return {
    si: validateUploadFile(siFile, "si"),
    bl: validateUploadFile(blFile, "bl"),
  };
}

export function createUploadFormData(siFile: File, blFile: File): FormData {
  const body = new FormData();
  body.append("si_file", siFile);
  body.append("bl_file", blFile);
  return body;
}

export function buildUploadResultHref(comparisonId: string): string {
  return `/upload/${encodeURIComponent(comparisonId)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(filename: string): string {
  return extensionFor(filename).replace(".", "").toLocaleUpperCase() || "Unknown";
}
