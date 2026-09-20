import { getBackendUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ emailId: string }> },
) {
  const { emailId } = await params;
  const upstreamUrl = `${getBackendUrl()}/api/cases/${encodeURIComponent(emailId)}/reviews`;
  let upstream: Response;

  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Case review proxy could not reach the backend.", { upstreamUrl, error });
    }
    return Response.json(
      { detail: "Backend unavailable. Check that the backend is running and try again." },
      { status: 502 },
    );
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers });
}
