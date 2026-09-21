import { getBackendUrl } from "@/lib/config";
import { submissionActionPaths, submissionRemovePath, submissionResendPath } from "@/lib/submission-api-contract";

export const dynamic = "force-dynamic";

async function forward(upstreamUrl: string, method: "POST" | "DELETE") {
  try {
    const upstream = await fetch(upstreamUrl, { method, cache: "no-store" });
    const headers = new Headers({ "Cache-Control": "no-store" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Outbound submission proxy could not reach the backend.", { upstreamUrl, error });
    }
    return Response.json(
      { detail: "Backend unavailable. Check that the backend is running and try again." },
      { status: 502 },
    );
  }
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
  if (!path) return Response.json({ detail: "Unknown submission action." }, { status: 404 });
  return forward(`${getBackendUrl()}${path}`, "POST");
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  const targetId = url.searchParams.get("target_id");
  if ((channel !== "supervisor" && channel !== "sender") || !targetId) {
    return Response.json({ detail: "A valid channel and target_id are required." }, { status: 422 });
  }
  const path = submissionRemovePath(channel, targetId);
  return forward(`${getBackendUrl()}${path}`, "DELETE");
}
