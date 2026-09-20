import { getBackendUrl } from "@/lib/config";
import { compareUploadPath } from "@/lib/upload-api-contract";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLocaleLowerCase().startsWith("multipart/form-data;")) {
    return Response.json({ detail: "A multipart upload is required." }, { status: 422 });
  }

  const upstreamUrl = `${getBackendUrl()}${compareUploadPath}`;
  let upstream: Response;

  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: await request.arrayBuffer(),
      cache: "no-store",
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Manual upload proxy could not reach the backend.", {
        upstreamUrl,
        error,
      });
    }
    return Response.json(
      { detail: "Backend unavailable. Check that the backend is running and try again." },
      { status: 502 },
    );
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) headers.set("Content-Type", upstreamContentType);

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers,
  });
}
