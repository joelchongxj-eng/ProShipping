import type { VerificationCase } from "@/types/verification";
import type { UploadComparisonResponse } from "@/types/upload";
import type {
  CreateHumanReviewRequest,
  EscalationAssignment,
  EscalationAssignmentHistory,
  HumanReviewHistory,
  HumanReviewRecord,
  HumanReviewQueueResponse,
  HumanReviewSummary,
  HumanReviewStatus,
  RetryAttemptHistory,
} from "@/types/human-review";
import { getBackendUrl } from "./config";
import { isUploadComparisonResponse, isVerificationCase } from "./api-validation";
import { createUploadFormData } from "./upload";
import {
  isEscalationAssignment,
  isEscalationAssignmentHistory,
  isHumanReviewHistory,
  isHumanReviewRecord,
  isHumanReviewQueueResponse,
  isHumanReviewSummary,
  isRetryAttemptHistory,
} from "./human-review-api-validation";
import {
  backendErrorDetail,
  compareUploadProxyPath,
  uploadAttachmentProxyPath,
  uploadComparisonPath,
  uploadHttpFallback,
} from "./upload-api-contract";
import { caseAttachmentProxyPath } from "./source-document";

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

async function request(
  path: string,
  init?: RequestInit,
  timeoutMs = 15000,
  sameOrigin = false,
  httpFallback?: (status: number) => string,
): Promise<unknown> {
  let requestUrl = path;
  if (!sameOrigin) {
    let baseUrl: string;
    try { baseUrl = getBackendUrl(); } catch {
      throw new ApiError("Backend configuration is missing or invalid. Set NEXT_PUBLIC_BACKEND_URL.", "configuration");
    }
    requestUrl = `${baseUrl}${path}`;
  }
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const diagnosticUrl = requestUrl.startsWith("/") && typeof window !== "undefined"
        ? new URL(requestUrl, window.location.origin).toString()
        : requestUrl;
      console.error("API request failed before an HTTP response was received.", {
        url: diagnosticUrl,
        error,
      });
    }
    throw new ApiError("Backend unavailable. Check that the backend is running and try again.", "unavailable");
  }
  if (!response.ok) {
    const detail = await getErrorDetail(response);
    const fallback = httpFallback?.(response.status) ?? `Backend request failed (HTTP ${response.status}).`;
    throw new ApiError(detail ?? fallback, "http", response.status);
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

export function getCaseAttachmentUrl(emailId: string, filename: string): string {
  return caseAttachmentProxyPath(emailId, filename);
}

export async function getCaseReviewSummary(emailId: string): Promise<HumanReviewSummary> {
  const data = await request(`/api/cases/${encodeURIComponent(emailId)}/review-summary`);
  if (!isHumanReviewSummary(data) || data.target_id !== emailId) {
    throw new ApiError("The backend returned an invalid Human Review summary.", "invalid");
  }
  return data;
}

export async function getCaseReviewHistory(emailId: string): Promise<HumanReviewHistory> {
  const data = await request(`/api/cases/${encodeURIComponent(emailId)}/reviews`);
  if (!isHumanReviewHistory(data) || data.target_id !== emailId) {
    throw new ApiError("The backend returned invalid Human Review history.", "invalid");
  }
  return data;
}

export async function getCaseRetryAttempts(emailId: string): Promise<RetryAttemptHistory> {
  const data = await request(`/api/cases/${encodeURIComponent(emailId)}/retry-attempts`);
  if (!isRetryAttemptHistory(data) || data.target_id !== emailId) {
    throw new ApiError("The backend returned invalid retry history.", "invalid");
  }
  return data;
}

export async function createCaseReview(emailId: string, payload: CreateHumanReviewRequest): Promise<HumanReviewRecord> {
  const data = await request(`/api/cases/${encodeURIComponent(emailId)}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 120000);
  if (!isHumanReviewRecord(data) || data.target_id !== emailId) {
    throw new ApiError("The backend returned an invalid Human Review record.", "invalid");
  }
  return data;
}

export async function compareUploadedDocuments(siFile: File, blFile: File): Promise<UploadComparisonResponse> {
  const data = await request(compareUploadProxyPath, {
    method: "POST",
    body: createUploadFormData(siFile, blFile),
  }, 120000, true, uploadHttpFallback);
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
  return uploadAttachmentProxyPath(comparisonId, role);
}

interface ReviewQueueQuery {
  limit?: number;
  offset?: number;
  humanReviewStatus?: HumanReviewStatus;
  isEscalated?: boolean;
}

export async function getReviewQueue(query: ReviewQueueQuery = {}): Promise<HumanReviewQueueResponse> {
  const search = new URLSearchParams();
  if (query.limit !== undefined) search.set("limit", String(query.limit));
  if (query.offset !== undefined) search.set("offset", String(query.offset));
  if (query.humanReviewStatus) search.set("human_review_status", query.humanReviewStatus);
  if (query.isEscalated !== undefined) search.set("is_escalated", String(query.isEscalated));
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  const data = await request(`/api/review-queue${suffix}`);
  if (!isHumanReviewQueueResponse(data)) {
    throw new ApiError("The backend returned an invalid Human Review queue.", "invalid");
  }
  return data;
}

export async function getCaseEscalations(emailId: string): Promise<EscalationAssignmentHistory> {
  const data = await request(`/api/cases/${encodeURIComponent(emailId)}/escalations`);
  if (!isEscalationAssignmentHistory(data) || data.target_id !== emailId) {
    throw new ApiError("The backend returned invalid escalation history.", "invalid");
  }
  return data;
}

export async function resendEscalation(assignmentId: string): Promise<EscalationAssignment> {
  const data = await request(`/api/escalations/${encodeURIComponent(assignmentId)}/resend`, { method: "POST" });
  if (!isEscalationAssignment(data) || data.assignment_id !== assignmentId) {
    throw new ApiError("The backend returned an invalid escalation delivery result.", "invalid");
  }
  return data;
}

export function getCompetitionSubmissionUrl(): string {
  return `${getBackendUrl()}/api/submission`;
}
