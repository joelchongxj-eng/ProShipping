import Link from "next/link";
import { ApiError } from "@/lib/api";

export function ApiErrorState({ error, retryHref }: { error: unknown; retryHref: string }) {
  const title = error instanceof ApiError
    ? error.kind === "invalid" ? "Invalid backend response" : error.kind === "configuration" ? "Backend configuration required" : error.kind === "unavailable" ? "Backend unavailable" : "Unable to load cases"
    : "Unable to load cases";
  return <div role="alert" className="space-y-3 rounded-md border border-slate-300 bg-white p-4"><h1 className="text-xl font-semibold">{title}</h1><p className="text-sm text-slate-600">{error instanceof ApiError ? error.message : "An unexpected error occurred. Please try again."}</p><a href={retryHref} className="mr-4 inline-block py-2 text-sm underline">Try again</a><Link href="/" className="text-sm underline">Back to Dashboard</Link></div>;
}
