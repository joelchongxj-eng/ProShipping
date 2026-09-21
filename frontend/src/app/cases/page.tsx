import type { Metadata } from "next";
import Link from "next/link";
import { loadCases } from "@/lib/cases";
import { isMockMode } from "@/lib/config";
import { ApiErrorState } from "@/components/api-error-state";
import { boardSections, filterCases, resolveCaseFilter } from "@/components/dashboard/dashboard-data";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import { BackLink } from "@/components/navigation/back-link";
import { FilteredCaseList } from "@/components/cases/filtered-case-list";

export const metadata: Metadata = { title: "Cases" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filter = resolveCaseFilter(resolvedSearchParams);
  let allCases;
  try { allCases = filter === "invalid" ? [] : await loadCases(); } catch (error) {
    return <ApiErrorState error={error} retryHref="/cases" />;
  }
  const cases = filter === "invalid" ? [] : filterCases(allCases, filter);
  const title = filter === "invalid" ? "Invalid case filter"
    : filter.reviewReason ? `${getReviewReasonDisplay(filter.reviewReason).label} Cases`
      : filter.group === "all" ? "All Cases"
        : `${boardSections.find((section) => section.key === filter.group)?.label} Cases`;

  return (
    <div className="space-y-4">
      <BackLink href="/">Back to Dashboard</BackLink>
      <div className="rounded-md border border-blue-100 bg-blue-50/60 p-4 shadow-sm"><h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1></div>
      {filter === "invalid" ? (
        <p className="text-sm text-slate-600">Choose a supported status and, for Needs Review, an optional review reason. <Link href="/cases" className="underline">View all cases</Link>.</p>
      ) : (
        <>
          <p className="text-sm text-slate-600">{cases.length} matching case{cases.length === 1 ? "" : "s"} · {isMockMode ? "Demo data" : "Backend data"}</p>
          {filter.group === "needs_review" && <p className="text-xs text-slate-500">{filter.reviewReason ? `Filtered by backend review reason: ${getReviewReasonDisplay(filter.reviewReason).label}.` : "All cases flagged by the backend for human review are shown here."}</p>}
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {cases.length > 0 ? <FilteredCaseList cases={cases} /> : <p className="px-4 py-4 text-sm text-slate-500">No cases</p>}
          </div>
        </>
      )}
    </div>
  );
}
