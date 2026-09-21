import type { CaseStatus, VerificationCase } from "@/types/verification";
import type { UploadComparisonResponse } from "@/types/upload";
import type { EmailDraft, SenderEmailDrafts, SubmissionDispatch, SubmissionWorkflowResponse } from "@/types/outbound";
import type {
  CreateHumanReviewRequest,
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
import { isEmailDraft, isSenderEmailDrafts, isSubmissionDispatch, isSubmissionWorkflowResponse } from "./submission-api-validation";
import { isProcessInboxResponse, processInboxProxyPath, type ProcessInboxResponse } from "./process-inbox";
import {
  submissionProxyActionPath,
  submissionProxyDraftPath,
  submissionProxyDraftPreviewPath,
  submissionProxyDraftSendPath,
  submissionProxyRemovePath,
  submissionProxyResendPath,
  submissionWorkflowPath,
  type SubmissionActionName,
} from "./submission-api-contract";

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
  const data = await request(`/api/case-reviews/${encodeURIComponent(emailId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 120000, true);
  if (!isHumanReviewRecord(data) || data.target_type !== "COMPETITION_CASE" || data.target_id !== emailId) {
    throw new ApiError("The backend returned an invalid Human Review record.", "invalid");
  }
  return data;
}

export async function processAllCases(): Promise<ProcessInboxResponse> {
  const data = await request(processInboxProxyPath, { method: "POST" }, 600000, true);
  if (!isProcessInboxResponse(data)) {
    throw new ApiError("The backend returned an invalid inbox processing response.", "invalid");
  }
  return data;
}

export async function createUploadReview(comparisonId: string, payload: CreateHumanReviewRequest): Promise<HumanReviewRecord> {
  const data = await request(`/api/upload-reviews/${encodeURIComponent(comparisonId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 120000, true);
  if (!isHumanReviewRecord(data) || data.target_type !== "UPLOAD_COMPARISON" || data.target_id !== comparisonId) {
    throw new ApiError("The backend returned an invalid upload Human Review record.", "invalid");
  }
  return data;
}

export async function getUploadReviewSummary(comparisonId: string): Promise<HumanReviewSummary> {
  const data = await request(`/api/upload-comparisons/${encodeURIComponent(comparisonId)}/review-summary`);
  if (!isHumanReviewSummary(data) || data.target_type !== "UPLOAD_COMPARISON" || data.target_id !== comparisonId) {
    throw new ApiError("The backend returned an invalid upload Human Review summary.", "invalid");
  }
  return data;
}

export async function getUploadReviewHistory(comparisonId: string): Promise<HumanReviewHistory> {
  const data = await request(`/api/upload-comparisons/${encodeURIComponent(comparisonId)}/reviews`);
  if (!isHumanReviewHistory(data) || data.target_type !== "UPLOAD_COMPARISON" || data.target_id !== comparisonId) {
    throw new ApiError("The backend returned invalid upload Human Review history.", "invalid");
  }
  return data;
}

export async function getUploadRetryAttempts(comparisonId: string): Promise<RetryAttemptHistory> {
  const data = await request(`/api/upload-comparisons/${encodeURIComponent(comparisonId)}/retry-attempts`);
  if (!isRetryAttemptHistory(data) || data.target_type !== "UPLOAD_COMPARISON" || data.target_id !== comparisonId) {
    throw new ApiError("The backend returned invalid upload retry history.", "invalid");
  }
  return data;
}

export async function getUploadEscalations(comparisonId: string): Promise<EscalationAssignmentHistory> {
  const data = await request(`/api/upload-comparisons/${encodeURIComponent(comparisonId)}/escalations`);
  if (!isEscalationAssignmentHistory(data) || data.target_type !== "UPLOAD_COMPARISON" || data.target_id !== comparisonId) {
    throw new ApiError("The backend returned invalid upload escalation history.", "invalid");
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
  includeMatch?: boolean;
  search?: string;
  automatedStatus?: CaseStatus;
  humanReviewStatus?: HumanReviewStatus;
  isEscalated?: boolean;
  retryRequested?: boolean;
}

export async function getReviewQueue(query: ReviewQueueQuery = {}): Promise<HumanReviewQueueResponse> {
  const search = new URLSearchParams();
  if (query.limit !== undefined) search.set("limit", String(query.limit));
  if (query.offset !== undefined) search.set("offset", String(query.offset));
  if (query.includeMatch !== undefined) search.set("include_match", String(query.includeMatch));
  if (query.search) search.set("search", query.search);
  if (query.automatedStatus) search.set("automated_status", query.automatedStatus);
  if (query.humanReviewStatus) search.set("human_review_status", query.humanReviewStatus);
  if (query.isEscalated !== undefined) search.set("is_escalated", String(query.isEscalated));
  if (query.retryRequested !== undefined) search.set("retry_requested", String(query.retryRequested));
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  const data = await request(`/api/review-queue${suffix}`);
  if (!isHumanReviewQueueResponse(data)) {
    throw new ApiError("The backend returned an invalid Human Review queue.", "invalid");
  }
  return data;
}

export async function getAllReviewQueueItems(): Promise<HumanReviewQueueResponse["items"]> {
  const limit = 100;
  const items: HumanReviewQueueResponse["items"] = [];
  for (let offset = 0; ; offset += limit) {
    const page = await getReviewQueue({ limit, offset });
    items.push(...page.items);
    if (items.length >= page.total || page.items.length === 0) return items;
  }
}

export async function getCaseEscalations(emailId: string): Promise<EscalationAssignmentHistory> {
  const data = await request(`/api/cases/${encodeURIComponent(emailId)}/escalations`);
  if (!isEscalationAssignmentHistory(data) || data.target_id !== emailId) {
    throw new ApiError("The backend returned invalid escalation history.", "invalid");
  }
  return data;
}

export async function getSubmissionWorkflow(): Promise<SubmissionWorkflowResponse> {
  const data = await request(submissionWorkflowPath);
  if (!isSubmissionWorkflowResponse(data)) {
    throw new ApiError("The backend returned an invalid submission workflow.", "invalid");
  }
  return data;
}

export async function refreshSubmissionWorkflow(): Promise<SubmissionWorkflowResponse> {
  const data = await request("/api/outbound-submission", undefined, 15000, true);
  if (!isSubmissionWorkflowResponse(data)) {
    throw new ApiError("The backend returned an invalid submission workflow.", "invalid");
  }
  return data;
}

async function submissionAction(
  action: SubmissionActionName,
): Promise<SubmissionDispatch> {
  const data = await request(submissionProxyActionPath(action), { method: "POST" }, 120000, true);
  if (!isSubmissionDispatch(data)) {
    throw new ApiError("The backend returned an invalid submission dispatch.", "invalid");
  }
  return data;
}

export function submitSupervisorSubmission(): Promise<SubmissionDispatch> {
  return submissionAction("supervisor-submit");
}

export function updateSupervisorSubmission(): Promise<SubmissionDispatch> {
  return submissionAction("supervisor-update");
}

export function sendSenderSubmission(): Promise<SubmissionDispatch> {
  return submissionAction("sender-send");
}

export function updateSenderSubmission(): Promise<SubmissionDispatch> {
  return submissionAction("sender-update");
}

export async function createSupervisorEmailDraft(): Promise<EmailDraft> {
  const data = await request(submissionProxyDraftPath("supervisor"), { method: "POST" }, 15000, true);
  if (!isEmailDraft(data)) throw new ApiError("The backend returned an invalid email draft.", "invalid");
  return data;
}

export async function createSenderEmailDrafts(): Promise<SenderEmailDrafts> {
  const data = await request(submissionProxyDraftPath("sender"), { method: "POST" }, 15000, true);
  if (!isSenderEmailDrafts(data)) throw new ApiError("The backend returned invalid sender email drafts.", "invalid");
  return data;
}

export async function previewEmailDraft(
  draftId: string,
  payload: Pick<EmailDraft, "revision" | "recipient" | "subject" | "body">,
): Promise<EmailDraft> {
  const data = await request(submissionProxyDraftPreviewPath(draftId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 15000, true);
  if (!isEmailDraft(data) || data.draft_id !== draftId) {
    throw new ApiError("The backend returned an invalid email draft preview.", "invalid");
  }
  return data;
}

export async function sendEmailDraft(draftId: string, revision: number): Promise<SubmissionDispatch> {
  const data = await request(submissionProxyDraftSendPath(draftId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision }),
  }, 120000, true);
  if (!isSubmissionDispatch(data)) throw new ApiError("The backend returned an invalid submission dispatch.", "invalid");
  return data;
}

export async function resendSubmissionDispatch(dispatchId: string): Promise<SubmissionDispatch> {
  const data = await request(submissionProxyResendPath(dispatchId), { method: "POST" }, 120000, true);
  if (!isSubmissionDispatch(data) || data.parent_dispatch_id !== dispatchId) {
    throw new ApiError("The backend returned an invalid resend dispatch.", "invalid");
  }
  return data;
}

export async function removeSubmissionItem(channel: "supervisor" | "sender", targetId: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(submissionProxyRemovePath(channel, targetId), {
      method: "DELETE",
      cache: "no-store",
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("Submission removal failed before receiving an HTTP response.", { error });
    throw new ApiError("Backend unavailable. Check that the backend is running and try again.", "unavailable");
  }
  if (!response.ok) {
    const detail = await getErrorDetail(response);
    throw new ApiError(detail ?? `Backend request failed (HTTP ${response.status}).`, "http", response.status);
  }
}

export function removeSupervisorSubmissionItem(targetId: string): Promise<void> {
  return removeSubmissionItem("supervisor", targetId);
}

export function removeSenderSubmissionItem(targetId: string): Promise<void> {
  return removeSubmissionItem("sender", targetId);
}

export function getCompetitionSubmissionUrl(): string {
  return `${getBackendUrl()}/api/submission`;
}
