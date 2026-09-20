const APP_ORIGIN = "http://proshipping.local";
const ALLOWED_RETURN_PATHS = new Set(["/", "/inbox", "/cases", "/review"]);

export function buildCaseDetailHref(emailId: string, returnTo: string): string {
  return `/cases/${encodeURIComponent(emailId)}?from=${encodeURIComponent(returnTo)}`;
}

export function resolveCaseReturnHref(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";

  try {
    const url = new URL(value, APP_ORIGIN);
    if (url.origin !== APP_ORIGIN || !ALLOWED_RETURN_PATHS.has(url.pathname) || url.hash) return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

export function getCaseReturnLabel(href: string, getReviewReasonLabel?: (value: string) => string | undefined): string {
  const url = new URL(href, APP_ORIGIN);
  if (url.pathname === "/inbox") return "Back to Inbox";
  if (url.pathname === "/review") return "Back to Human Review";
  if (url.pathname !== "/cases") return "Back to Dashboard";

  const reviewReason = url.searchParams.get("review_reason");
  const reviewReasonLabel = reviewReason ? getReviewReasonLabel?.(reviewReason) : undefined;
  if (reviewReasonLabel) {
    return `Back to ${reviewReasonLabel} Cases`;
  }

  switch (url.searchParams.get("status")?.toUpperCase()) {
    case "MATCH":
      return "Back to Matched Cases";
    case "MISMATCH":
      return "Back to Mismatch Cases";
    case "NEEDS_REVIEW":
      return "Back to Needs Review";
    case "FAILED":
      return "Back to Failed Cases";
    default:
      return "Back to Cases";
  }
}
