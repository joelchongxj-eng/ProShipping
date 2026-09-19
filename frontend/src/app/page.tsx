import type { Metadata } from "next";
import { loadCases } from "@/lib/cases";
import { isMockMode } from "@/lib/config";
import { ApiErrorState } from "@/components/api-error-state";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { StatusSection } from "@/components/dashboard/status-section";
import { boardSections, groupCases } from "@/components/dashboard/dashboard-data";

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
    missing_information: groups.missing_information.length,
    failed: groups.failed.length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Overview of shipping document verification cases.</p>
        </div>
        <div className="shrink-0">
          <button type="button" disabled aria-describedby="upload-note" className="min-h-11 cursor-not-allowed rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">Upload SI &amp; Draft BL</button>
          <p id="upload-note" className="mt-1.5 text-xs text-slate-500">Upload is not available yet.</p>
        </div>
      </div>
      <DashboardSummary total={cases.length} counts={counts} />
      <p className="text-xs text-slate-500">{isMockMode ? "Demo data · Synthetic verification cases" : "Backend data · BL comparison cases"}</p>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {boardSections.map(({ key, label }) => <StatusSection key={key} group={key} title={label} cases={groups[key]} />)}
      </div>
    </div>
  );
}
