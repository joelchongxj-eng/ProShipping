import { getBackendUrl } from "@/lib/config";
import { submissionActionPaths, submissionDraftPath, submissionDraftPreviewPath, submissionDraftSendPath, submissionRemovePath, submissionResendPath } from "@/lib/submission-api-contract";
import { forwardSubmissionRequest } from "@/lib/submission-proxy";

export const dynamic = "force-dynamic";

function backendRequestUrl(path: string): string {
  return new URL(path, `${getBackendUrl()}/`).toString();
}

export async function GET() {
  return forwardSubmissionRequest(backendRequestUrl("/api/submission-workflow"), "GET");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  let path: string | undefined;
  if (action && action in submissionActionPaths) path = submissionActionPaths[action as keyof typeof submissionActionPaths];
  if (action === "resend") {
    const dispatchId = url.searchParams.get("dispatch_id");
    if (!dispatchId) return Response.json({ detail: "dispatch_id is required." }, { status: 422 });
    path = submissionResendPath(dispatchId);
  }
  if (action === "create-draft") {
    const channel = url.searchParams.get("channel");
    if (channel !== "supervisor" && channel !== "sender") {
      return Response.json({ detail: "A valid channel is required." }, { status: 422 });
    }
    path = submissionDraftPath(channel);
  }
  if (action === "preview-draft" || action === "send-draft") {
    const draftId = url.searchParams.get("draft_id");
    if (!draftId) return Response.json({ detail: "draft_id is required." }, { status: 422 });
    path = action === "preview-draft" ? submissionDraftPreviewPath(draftId) : submissionDraftSendPath(draftId);
  }
  if (!path) return Response.json({ detail: "Unknown submission action." }, { status: 404 });
  const body = request.headers.get("content-type")?.includes("application/json")
    ? await request.text()
    : undefined;
  return forwardSubmissionRequest(backendRequestUrl(path), "POST", fetch, body);
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  const targetId = url.searchParams.get("target_id");
  if ((channel !== "supervisor" && channel !== "sender") || !targetId) {
    return Response.json({ detail: "A valid channel and target_id are required." }, { status: 422 });
  }
  const path = submissionRemovePath(channel, targetId);
  return forwardSubmissionRequest(backendRequestUrl(path), "DELETE");
}
