import { ApiError } from "@/lib/api";
import { BackLink } from "@/components/navigation/back-link";

export function ApiErrorState({ error, retryHref, backHref = "/", backLabel = "Back to Dashboard", httpTitle = "Unable to load cases" }: { error: unknown; retryHref: string; backHref?: string; backLabel?: string; httpTitle?: string }) {
  const title = error instanceof ApiError
    ? error.kind === "invalid" ? "Invalid backend response" : error.kind === "configuration" ? "Backend configuration required" : error.kind === "unavailable" ? "Backend unavailable" : httpTitle
    : httpTitle;
  return <div role="alert" className="space-y-3 rounded-md border border-red-200 bg-white p-4 shadow-sm"><div className="border-l-2 border-red-500 pl-3"><h1 className="text-lg font-semibold text-slate-950">{title}</h1><p className="mt-1 text-sm leading-6 text-slate-600">{error instanceof ApiError ? error.message : "An unexpected error occurred. Please try again."}</p></div><div className="flex flex-wrap items-center gap-3"><a href={retryHref} className="inline-flex min-h-9 items-center rounded-md bg-blue-950 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">Try again</a><BackLink href={backHref}>{backLabel}</BackLink></div></div>;
}
