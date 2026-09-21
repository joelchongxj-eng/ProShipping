import Link from "next/link";
import type { VerificationCase } from "@/types/verification";
import { CaseRow } from "./case-row";
import { caseListRoutes, statusStyles, type BoardGroup } from "./dashboard-data";

const PREVIEW_LIMIT = 3;

export function StatusSection({ group, title, cases }: { group: BoardGroup; title: string; cases: VerificationCase[] }) {
  const headingId = `section-${group}`;
  const remaining = Math.max(0, cases.length - PREVIEW_LIMIT);
  return (
    <section aria-labelledby={headingId} className="flex h-[392px] min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4">
        <h2 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <span aria-hidden="true" className={`size-2.5 rounded-full border ${statusStyles[group]}`} />
          {title}
        </h2>
        <span aria-label={`${cases.length} cases`} className={`rounded-md border px-2 py-1 text-xs font-semibold tabular-nums ${statusStyles[group]}`}>{cases.length}</span>
      </div>
      {cases.length > 0 ? (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ul className="divide-y divide-slate-100">{cases.slice(0, PREVIEW_LIMIT).map((item) => <CaseRow key={item.email.email_id} item={item} returnTo="/" compact />)}</ul>
          {remaining > 0 && <div aria-hidden="true" data-preview-fade className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-white" />}
        </div>
      ) : <p className="flex-1 px-4 py-4 text-sm text-slate-500">No cases</p>}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-4 text-xs">
        <span className="text-slate-500">Showing {Math.min(cases.length, PREVIEW_LIMIT)} of {cases.length}</span>
        <Link href={caseListRoutes[group]} aria-label={`View all ${title} cases`} className="inline-flex min-h-9 items-center font-semibold text-blue-900 hover:text-blue-700">View all <span aria-hidden="true" className="ml-1">→</span></Link>
      </div>
    </section>
  );
}
