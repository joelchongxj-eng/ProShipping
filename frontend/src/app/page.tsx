import type { Metadata } from "next";
import Link from "next/link";
import { loadCases } from "@/lib/cases";
import { isMockMode } from "@/lib/config";
import { ApiErrorState } from "@/components/api-error-state";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { StatusSection } from "@/components/dashboard/status-section";
import { NeedsReviewSection } from "@/components/dashboard/needs-review-section";
import { groupCases } from "@/components/dashboard/dashboard-data";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function Page() {
  let cases;
  try { cases = (await loadCases()).filter((item) => item.category === "BL_COMPARISON"); } catch (error) {
    return <ApiErrorState error={error} retryHref="/" />;
  }
  const groups = groupCases(cases);
  const counts = {
    matched: groups.matched.length,
    mismatch: groups.mismatch.length,
    needs_review: groups.needs_review.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-md border border-blue-100 bg-blue-50/60 p-4 shadow-sm sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">Overview of shipping document verification cases.</p>
        </div>
        <div className="shrink-0 sm:text-right">
          <Link href="/upload" className="inline-flex min-h-10 items-center rounded-md bg-blue-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">Upload SI &amp; Draft BL</Link>
          <p className="mt-1.5 text-xs text-slate-500">Start a separate manual comparison.</p>
        </div>
      </div>
      <DashboardSummary total={cases.length} counts={counts} />
      {isMockMode && <p className="text-xs text-slate-500">Demo data · Synthetic verification cases</p>}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <StatusSection group="matched" title="Matched" cases={groups.matched} />
        <StatusSection group="mismatch" title="Mismatch" cases={groups.mismatch} />
        <NeedsReviewSection cases={groups.needs_review} />
      </div>
    </div>
  );
}
