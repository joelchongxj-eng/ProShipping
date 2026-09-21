import { getBackendUrl } from "@/lib/config";
import { caseAttachmentPath, forwardCaseAttachmentRequest } from "@/lib/source-document";

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
  try {
    return await forwardCaseAttachmentRequest(upstreamUrl);
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
}
