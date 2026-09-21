export type SubmissionProxyMethod = "GET" | "POST" | "DELETE";

const bodylessResponseStatuses = new Set([204, 205, 304]);

export async function forwardSubmissionRequest(
  upstreamUrl: string,
  method: SubmissionProxyMethod,
  fetchImplementation: typeof fetch = fetch,
): Promise<Response> {
  try {
    const upstream = await fetchImplementation(upstreamUrl, { method, cache: "no-store" });
    const headers = new Headers({ "Cache-Control": "no-store" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    if (bodylessResponseStatuses.has(upstream.status)) {
      return new Response(null, { status: upstream.status, headers });
    }
    return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Outbound submission proxy could not reach the backend.", {
        method,
        upstreamUrl,
        error,
      });
    }
    return Response.json(
      { detail: "Backend unavailable. Check that the backend is running and try again." },
      { status: 502 },
    );
  }
}
