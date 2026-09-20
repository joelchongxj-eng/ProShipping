import { getBackendUrl } from "@/lib/config";
import { uploadAttachmentPath } from "@/lib/upload-api-contract";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ comparisonId: string; role: string }> },
) {
  const { comparisonId, role } = await params;
  if (role !== "si" && role !== "bl") {
    return Response.json({ detail: "Upload attachment role is invalid." }, { status: 404 });
  }

  const upstreamUrl = `${getBackendUrl()}${uploadAttachmentPath(comparisonId, role)}`;
  let upstream: Response;

  try {
    upstream = await fetch(upstreamUrl, { cache: "no-store" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Upload attachment proxy could not reach the backend.", {
        upstreamUrl,
        error,
      });
    }
    return Response.json(
      { detail: "Backend attachment service is unavailable." },
      { status: 502 },
    );
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers,
  });
}
