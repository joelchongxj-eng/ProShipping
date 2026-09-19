import type { Metadata } from "next";
import Link from "next/link";
import { loadCases } from "@/lib/cases";
import { isMockMode } from "@/lib/config";
import { ApiErrorState } from "@/components/api-error-state";
import { CaseRow } from "@/components/dashboard/case-row";
import { boardSections, groupCases, resolveCaseFilter } from "@/components/dashboard/dashboard-data";

export const metadata: Metadata = { title: "Cases" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filter = resolveCaseFilter(await searchParams);
  let allCases;
  try { allCases = filter === "invalid" ? [] : (await loadCases()).filter((item) => item.category === "BL_COMPARISON"); } catch (error) {
    return <ApiErrorState error={error} retryHref="/cases" />;
  }
  const cases = filter === "invalid" ? [] : filter === "all" ? allCases : groupCases(allCases)[filter];
  const title = filter === "invalid" ? "Invalid case filter" : filter === "all" ? "All Cases" : `${boardSections.find((section) => section.key === filter)?.label} Cases`;

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">Back to Dashboard</Link>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
      {filter === "invalid" ? (
        <p className="text-sm text-slate-600">Choose one supported status or field_status=missing. <Link href="/cases" className="underline">View all cases</Link>.</p>
      ) : (
        <>
          <p className="text-sm text-slate-600">{cases.length} matching case{cases.length === 1 ? "" : "s"} · {isMockMode ? "Demo data" : "Backend data"}</p>
          {filter === "needs_review" && <p className="text-xs text-slate-500">Cases with missing fields are listed separately under <Link href="/cases?field_status=missing" className="underline">Missing Information</Link>.</p>}
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            {cases.length > 0 ? <ul aria-label="Matching cases" className="divide-y divide-slate-200">{cases.map((item) => <CaseRow key={item.email.email_id} item={item} />)}</ul> : <p className="px-4 py-4 text-sm text-slate-500">No cases</p>}
          </div>
        </>
      )}
    </div>
  );
}
