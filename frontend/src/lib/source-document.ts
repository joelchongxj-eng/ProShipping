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

export async function fetchTextSource(url: string, fetcher: SourceFetch = fetch): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(url, { cache: "no-store" });
  } catch (error) {
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
    throw new SourceDocumentError("Source file could not be read.");
  }
}
