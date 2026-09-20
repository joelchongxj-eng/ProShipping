import { getBackendUrl } from "@/lib/config";
import { caseAttachmentPath } from "@/lib/source-document";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ emailId: string }> },
) {
  const { emailId } = await params;
  const filename = new URL(request.url).searchParams.get("filename");

  if (!filename) {
    return Response.json({ detail: "filename is required." }, { status: 422 });
  }

  const upstreamUrl = `${getBackendUrl()}${caseAttachmentPath(emailId, filename)}`;
  let upstream: Response;

  try {
    upstream = await fetch(upstreamUrl, { cache: "no-store" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Case attachment proxy could not reach the backend.", {
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
  const contentType = upstream.headers.get("content-type");
  const contentDisposition = upstream.headers.get("content-disposition");
  if (contentType) headers.set("Content-Type", contentType);
  if (contentDisposition) headers.set("Content-Disposition", contentDisposition);

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers,
  });
}
