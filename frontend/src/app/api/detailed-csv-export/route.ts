import { getBackendUrl } from "@/lib/config";
import { forwardSubmissionRequest } from "@/lib/submission-proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  const upstreamUrl = new URL("/api/export/detailed-csv", `${getBackendUrl()}/`).toString();
  return forwardSubmissionRequest(upstreamUrl, "GET");
}
