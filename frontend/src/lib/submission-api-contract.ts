export const submissionWorkflowPath = "/api/submission-workflow";

export const submissionActionPaths = {
  "supervisor-submit": "/api/submission/supervisor/submit",
  "supervisor-update": "/api/submission/supervisor/update",
  "sender-send": "/api/submission/sender/send",
  "sender-update": "/api/submission/sender/update",
} as const;

export type SubmissionActionName = keyof typeof submissionActionPaths;

export function submissionRemovePath(channel: "supervisor" | "sender", targetId: string): string {
  return `/api/submission-workflow/${channel}/${encodeURIComponent(targetId)}`;
}

export function submissionResendPath(dispatchId: string): string {
  return `/api/submission/dispatches/${encodeURIComponent(dispatchId)}/resend`;
}

export function submissionDraftPath(channel: "supervisor" | "sender"): string {
  return `/api/submission/drafts/${channel}`;
}

export function submissionDraftPreviewPath(draftId: string): string {
  return `/api/submission/drafts/${encodeURIComponent(draftId)}/preview`;
}

export function submissionDraftSendPath(draftId: string): string {
  return `/api/submission/drafts/${encodeURIComponent(draftId)}/send`;
}

export function submissionProxyActionPath(action: SubmissionActionName): string {
  return `/api/outbound-submission?action=${action}`;
}

export function submissionProxyRemovePath(channel: "supervisor" | "sender", targetId: string): string {
  return `/api/outbound-submission?${new URLSearchParams({ channel, target_id: targetId }).toString()}`;
}

export function submissionProxyResendPath(dispatchId: string): string {
  return `/api/outbound-submission?${new URLSearchParams({ action: "resend", dispatch_id: dispatchId }).toString()}`;
}

export function submissionProxyDraftPath(channel: "supervisor" | "sender"): string {
  return `/api/outbound-submission?${new URLSearchParams({ action: "create-draft", channel }).toString()}`;
}

export function submissionProxyDraftPreviewPath(draftId: string): string {
  return `/api/outbound-submission?${new URLSearchParams({ action: "preview-draft", draft_id: draftId }).toString()}`;
}

export function submissionProxyDraftSendPath(draftId: string): string {
  return `/api/outbound-submission?${new URLSearchParams({ action: "send-draft", draft_id: draftId }).toString()}`;
}
