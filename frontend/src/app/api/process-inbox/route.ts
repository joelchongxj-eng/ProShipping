import { getBackendUrl } from "@/lib/config";
import { forwardProcessInboxRequest, processInboxBackendPath } from "@/lib/process-inbox";

export const dynamic = "force-dynamic";

export async function POST() {
  const upstreamUrl = new URL(processInboxBackendPath, `${getBackendUrl()}/`).toString();
  return forwardProcessInboxRequest(upstreamUrl);
}
