import type { VerificationCase } from "@/types/verification";
import type { UploadComparisonResponse } from "@/types/upload";
import { getBackendUrl } from "./config";
import { isUploadComparisonResponse, isVerificationCase } from "./api-validation";
import { createUploadFormData } from "./upload";
import {
  backendErrorDetail,
  compareUploadPath,
  uploadAttachmentPath,
  uploadComparisonPath,
} from "./upload-api-contract";

export class ApiError extends Error {
  public readonly kind: "configuration" | "unavailable" | "http" | "invalid";
  public readonly status?: number;

  constructor(message: string, kind: "configuration" | "unavailable" | "http" | "invalid", status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

async function getErrorDetail(response: Response): Promise<string | null> {
  try {
    const data: unknown = await response.json();
    return backendErrorDetail(data);
  } catch {
    return null;
  }
}

async function request(path: string, init?: RequestInit, timeoutMs = 15000): Promise<unknown> {
  let baseUrl: string;
  try { baseUrl = getBackendUrl(); } catch {
    throw new ApiError("Backend configuration is missing or invalid. Set NEXT_PUBLIC_BACKEND_URL.", "configuration");
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiError("Backend unavailable. Check that the backend is running and try again.", "unavailable");
  }
  if (!response.ok) {
    const detail = await getErrorDetail(response);
    throw new ApiError(detail ?? `Backend request failed (HTTP ${response.status}).`, "http", response.status);
  }
  try { return await response.json(); } catch {
    throw new ApiError("The backend returned invalid JSON.", "invalid");
  }
}

export async function getHealth(): Promise<{ status: string; service: string }> {
  const data = await request("/health");
  if (typeof data !== "object" || data === null || !("status" in data) || !("service" in data) || typeof data.status !== "string" || typeof data.service !== "string") {
    throw new ApiError("The backend returned an invalid health response.", "invalid");
  }
  return { status: data.status, service: data.service };
}

export async function getCases(): Promise<VerificationCase[]> {
  const data = await request("/api/cases");
  if (!Array.isArray(data) || !data.every(isVerificationCase)) throw new ApiError("The backend returned an invalid case list.", "invalid");
  return data;
}

export async function getCase(emailId: string): Promise<VerificationCase> {
  const data = await request(`/api/cases/${encodeURIComponent(emailId)}`);
  if (!isVerificationCase(data) || data.email.email_id !== emailId) throw new ApiError("The backend returned an invalid case response.", "invalid");
  return data;
}

export async function compareUploadedDocuments(siFile: File, blFile: File): Promise<UploadComparisonResponse> {
  const data = await request(compareUploadPath, {
    method: "POST",
    body: createUploadFormData(siFile, blFile),
  }, 120000);
  if (!isUploadComparisonResponse(data)) {
    throw new ApiError("The backend returned an invalid upload comparison response.", "invalid");
  }
  return data;
}

export async function getUploadComparison(comparisonId: string): Promise<UploadComparisonResponse> {
  const data = await request(uploadComparisonPath(comparisonId));
  if (!isUploadComparisonResponse(data) || data.comparison_id !== comparisonId) {
    throw new ApiError("The backend returned an invalid upload comparison response.", "invalid");
  }
  return data;
}

export function getUploadAttachmentUrl(comparisonId: string, role: "si" | "bl"): string {
  return `${getBackendUrl()}${uploadAttachmentPath(comparisonId, role)}`;
}
