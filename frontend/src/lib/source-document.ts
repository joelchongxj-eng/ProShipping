export type SourceFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class SourceDocumentError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SourceDocumentError";
    this.status = status;
  }
}

export function caseAttachmentPath(emailId: string, attachmentPath: string): string {
  const query = new URLSearchParams({ filename: attachmentPath });
  return `/api/cases/${encodeURIComponent(emailId)}/attachment?${query.toString()}`;
}

export function caseAttachmentProxyPath(emailId: string, attachmentPath: string): string {
  const query = new URLSearchParams({ filename: attachmentPath });
  return `/api/case-attachments/${encodeURIComponent(emailId)}?${query.toString()}`;
}

export async function forwardCaseAttachmentRequest(
  upstreamUrl: string,
  fetcher: SourceFetch = fetch,
): Promise<Response> {
  let upstream = await fetcher(upstreamUrl, { cache: "no-store" });
  if (upstream.status === 502) {
    // A stalled stream cancellation must not block the one allowed retry.
    void upstream.body?.cancel().catch(() => {});
    upstream = await fetcher(upstreamUrl, { cache: "no-store" });
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

export async function fetchTextSource(
  url: string,
  fetcher: SourceFetch = fetch,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<string> {
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? 40_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  let response: Response;
  try {
    response = await fetcher(url, { cache: "no-store", signal });
  } catch (error) {
    if (timeoutSignal.aborted) throw new SourceDocumentError("Source file request timed out.");
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (process.env.NODE_ENV !== "production") {
      console.error("Source request failed before an HTTP response was received.", { url, error });
    }
    throw new SourceDocumentError("Unable to connect to the backend.");
  }

  if (!response.ok) {
    if (response.status === 404) throw new SourceDocumentError("Source file could not be found.", 404);
    if (response.status === 422) throw new SourceDocumentError("Source file request is invalid.", 422);
    if (response.status >= 500) throw new SourceDocumentError("Source file could not be loaded.", response.status);
    throw new SourceDocumentError("Source file request failed.", response.status);
  }

  const contentType = response.headers.get("content-type")?.toLocaleLowerCase();
  if (!contentType?.startsWith("text/plain")) {
    throw new SourceDocumentError("Source file returned an unsupported response.");
  }

  try {
    return await response.text();
  } catch {
    if (timeoutSignal.aborted) throw new SourceDocumentError("Source file request timed out.");
    if (options.signal?.aborted) throw options.signal.reason;
    throw new SourceDocumentError("Source file could not be read.");
  }
}
