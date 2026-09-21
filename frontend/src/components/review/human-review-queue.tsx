"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { HumanReviewStatusBadge } from "@/components/review/human-review-panel";
import { buildCaseDetailHref } from "@/lib/case-navigation";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import {
  filterReviewQueue,
  humanReviewStatuses,
  humanReviewStatusLabels,
  summarizeReviewQueue,
  type AutomatedStatusFilter,
  type HumanReviewStatusFilter,
} from "@/lib/human-review";
import type { HumanReviewQueueItem } from "@/types/human-review";

const automatedStatusFilters: { value: AutomatedStatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "MISMATCH", label: "Mismatch" },
  { value: "NEEDS_REVIEW", label: "Needs Review" },
];

const humanReviewStatusFilters: { value: HumanReviewStatusFilter; label: string }[] = [
  { value: "ALL", label: "All Review Statuses" },
  ...humanReviewStatuses.map((status) => ({ value: status, label: humanReviewStatusLabels[status] })),
];

const cellClass = "block min-w-0 px-3 py-2 lg:table-cell lg:py-3";
const mobileLabel = "mb-1 block text-xs font-medium text-slate-500 lg:hidden";

export function HumanReviewQueue({ cases }: { cases: HumanReviewQueueItem[] }) {
  const [automatedStatusFilter, setAutomatedStatusFilter] = useState<AutomatedStatusFilter>("ALL");
  const [humanReviewStatusFilter, setHumanReviewStatusFilter] = useState<HumanReviewStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const shown = filterReviewQueue(cases, automatedStatusFilter, humanReviewStatusFilter, search);
  const summary = summarizeReviewQueue(cases);

  return (
    <div className="space-y-4">
      <dl aria-label="Human Review queue summary" className="flex flex-wrap gap-x-8 gap-y-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        {[
          ["Queue Cases", summary.total],
          ["Mismatch", summary.mismatch],
          ["Needs Review", summary.needsReview],
        ].map(([label, count]) => (
          <div key={label} className="flex items-center gap-2">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-semibold tabular-nums text-slate-950">{count}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 rounded-md border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] lg:items-end">
        <div className="space-y-3">
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-slate-600">Automated Status</legend>
            <div className="flex flex-wrap gap-2">
              {automatedStatusFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={automatedStatusFilter === item.value}
                  onClick={() => setAutomatedStatusFilter(item.value)}
                  className={`min-h-10 rounded-md border px-3 text-sm font-semibold ${automatedStatusFilter === item.value ? "border-blue-900 bg-blue-950 text-white shadow-sm" : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-slate-600">Human Review Status</legend>
            <div className="flex flex-wrap gap-1.5">
              {humanReviewStatusFilters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={humanReviewStatusFilter === item.value}
                  onClick={() => setHumanReviewStatusFilter(item.value)}
                  className={`min-h-9 rounded-md border px-2.5 text-xs font-medium ${humanReviewStatusFilter === item.value ? "border-blue-300 bg-blue-100 text-blue-950" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <label className="w-full text-xs font-medium text-slate-600 lg:max-w-sm">
          Search by Email ID or subject
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search review queue"
            className="mt-1 block min-h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p role="status">{shown.length} of {cases.length} queue cases</p>
        <p>Automated and Human Review status are filtered separately.</p>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="block w-full table-fixed text-left text-sm lg:table">
          <caption className="sr-only">Cases requiring human attention, separated by automated and Human Review status</caption>
          <thead className="hidden border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 lg:table-header-group">
            <tr>
              <th scope="col" className="w-[14%] px-3 py-3 font-medium">Email ID</th>
              <th scope="col" className="w-[32%] px-3 py-3 font-medium">Subject</th>
              <th scope="col" className="w-[14%] px-3 py-3 font-medium">Automated Status</th>
              <th scope="col" className="w-[15%] px-3 py-3 font-medium">Human Review Status</th>
              <th scope="col" className="w-[15%] px-3 py-3 font-medium">Review Reason</th>
              <th scope="col" className="w-[10%] px-3 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="block lg:table-row-group">
            {shown.map((item) => (
                <tr key={item.target_id} className="grid grid-cols-1 border-b border-slate-200 last:border-b-0 sm:grid-cols-2 lg:table-row lg:hover:bg-blue-50/40">
                  <td className={cellClass}><span className={mobileLabel}>Email ID</span><span className="break-all font-mono text-xs">{item.email_id}</span></td>
                  <td className={cellClass}><span className={mobileLabel}>Subject</span><span className="break-words font-medium text-slate-900">{item.subject}</span></td>
                  <td className={cellClass}><span className={mobileLabel}>Automated Status</span><StatusBadge status={item.automated_status} /></td>
                  <td className={cellClass}><span className={mobileLabel}>Human Review Status</span><HumanReviewStatusBadge status={item.human_review_status} /></td>
                  <td className={cellClass}><span className={mobileLabel}>Review Reason</span><span className="text-xs text-slate-700">{item.review_reason ? getReviewReasonDisplay(item.review_reason).label : "Not supplied"}</span></td>
                  <td className={cellClass}><Link prefetch={false} href={buildCaseDetailHref(item.email_id, "/review")} className="inline-flex min-h-9 items-center font-semibold text-blue-900 hover:text-blue-700">Open Review <span aria-hidden="true" className="ml-1">→</span></Link></td>
                </tr>
            ))}
            {shown.length === 0 && <tr className="block lg:table-row"><td colSpan={6} className="block px-4 py-6 text-sm text-slate-500 lg:table-cell">No review cases match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
