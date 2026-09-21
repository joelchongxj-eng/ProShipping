export type SubmissionProxyMethod = "GET" | "POST" | "DELETE";

const bodylessResponseStatuses = new Set([204, 205, 304]);

export async function forwardSubmissionRequest(
  upstreamUrl: string,
  method: SubmissionProxyMethod,
  fetchImplementation: typeof fetch = fetch,
  body?: BodyInit,
): Promise<Response> {
  try {
    const headers = new Headers();
    const authorizationToken = process.env.OUTBOUND_EMAIL_AUTH_TOKEN;
    if (method === "POST" && authorizationToken) {
      headers.set("X-Outbound-Email-Token", authorizationToken);
    }
    if (body !== undefined) headers.set("Content-Type", "application/json");
    const upstream = await fetchImplementation(upstreamUrl, {
      method,
      cache: "no-store",
      headers,
      body,
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);
    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition) responseHeaders.set("Content-Disposition", contentDisposition);
    if (bodylessResponseStatuses.has(upstream.status)) {
      return new Response(null, { status: upstream.status, headers: responseHeaders });
    }
    return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
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
