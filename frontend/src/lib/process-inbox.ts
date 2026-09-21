export interface ProcessInboxResponse {
  processed: number;
  status_counts: Record<string, number>;
}

export const processInboxBackendPath = "/api/process-all";
export const processInboxProxyPath = "/api/process-inbox";

export function isProcessInboxResponse(value: unknown): value is ProcessInboxResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ProcessInboxResponse>;
  if (!Number.isInteger(candidate.processed) || (candidate.processed ?? -1) < 0) return false;
  if (typeof candidate.status_counts !== "object" || candidate.status_counts === null || Array.isArray(candidate.status_counts)) return false;
  return Object.values(candidate.status_counts).every((count) => Number.isInteger(count) && count >= 0);
}

export async function forwardProcessInboxRequest(
  upstreamUrl: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetchImplementation(upstreamUrl, {
      method: "POST",
      cache: "no-store",
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Process Inbox proxy could not reach the backend.", { upstreamUrl, error });
    }
    return Response.json({ detail: "Unable to connect to the backend." }, { status: 502 });
  }

  if (!upstream.ok) {
    const detail = upstream.status === 502
      ? "Inbox service unavailable."
      : upstream.status === 500
        ? "Inbox processing failed."
        : `Inbox processing request failed (HTTP ${upstream.status}).`;
    return Response.json({ detail }, { status: upstream.status });
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers });
}
