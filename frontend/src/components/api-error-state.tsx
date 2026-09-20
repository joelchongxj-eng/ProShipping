import { ApiError } from "@/lib/api";
import { BackLink } from "@/components/navigation/back-link";

export function ApiErrorState({ error, retryHref, backHref = "/", backLabel = "Back to Dashboard", httpTitle = "Unable to load cases" }: { error: unknown; retryHref: string; backHref?: string; backLabel?: string; httpTitle?: string }) {
  const title = error instanceof ApiError
    ? error.kind === "invalid" ? "Invalid backend response" : error.kind === "configuration" ? "Backend configuration required" : error.kind === "unavailable" ? "Backend unavailable" : httpTitle
    : httpTitle;
  return <div role="alert" className="space-y-3 rounded-md border border-slate-300 bg-white p-4"><h1 className="text-xl font-semibold">{title}</h1><p className="text-sm text-slate-600">{error instanceof ApiError ? error.message : "An unexpected error occurred. Please try again."}</p><div className="flex flex-wrap items-center gap-3"><a href={retryHref} className="inline-flex min-h-9 items-center rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">Try again</a><BackLink href={backHref}>{backLabel}</BackLink></div></div>;
}
