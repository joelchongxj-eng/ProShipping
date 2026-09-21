import Link from "next/link";
import type { VerificationCase } from "@/types/verification";
import { groupReviewReasonCases, statusStyles } from "./dashboard-data";
import { reviewReasonDisplays, reviewReasons } from "@/lib/review-reason";
import { buildCaseDetailHref } from "@/lib/case-navigation";

const REVIEW_PREVIEW_LIMIT = 3;

export function NeedsReviewSection({ cases }: { cases: VerificationCase[] }) {
  const groups = groupReviewReasonCases(cases);

  return (
    <section aria-labelledby="needs-review-title" className="overflow-hidden rounded-md border border-amber-200 bg-white shadow-sm lg:col-span-2">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2">
        <h2 id="needs-review-title" className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <span aria-hidden="true" className={`size-2.5 rounded-full border ${statusStyles.needs_review}`} />
          Needs Review
        </h2>
        <span aria-label={`${cases.length} cases`} className={`rounded-md border px-2 py-1 text-xs font-semibold tabular-nums ${statusStyles.needs_review}`}>{cases.length}</span>
      </div>
      <div className="divide-y divide-slate-200">
        {reviewReasons.map((reason) => {
          const reasonCases = groups[reason];
          const reasonLabel = reviewReasonDisplays[reason].label;
          const route = `/cases?status=NEEDS_REVIEW&review_reason=${reason}`;

          return (
            <section key={reason} aria-labelledby={`review-reason-${reason}`}>
              <div className="flex min-h-11 items-center justify-between gap-3 bg-slate-50 px-4 py-2">
                <h3 id={`review-reason-${reason}`} className="text-sm font-semibold text-slate-900">{reasonLabel}</h3>
                <span aria-label={`${reasonCases.length} cases`} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-900">
                  {reasonCases.length}
                </span>
              </div>

              {reasonCases.length > 0 ? (
                <ul className="divide-y divide-slate-100" aria-label={`${reasonLabel} case previews`}>
                  {reasonCases.slice(0, REVIEW_PREVIEW_LIMIT).map((item) => (
                    <li key={item.email.email_id}>
                      <Link
                        href={buildCaseDetailHref(item.email.email_id, "/")}
                        className="grid min-h-14 gap-1 px-4 py-2.5 hover:bg-amber-50/70 focus-visible:-outline-offset-2 sm:grid-cols-[minmax(9rem,0.35fr)_minmax(0,1fr)] sm:items-center sm:gap-4"
                      >
                        <span className="truncate font-mono text-xs font-medium text-slate-600" title={item.email.email_id}>
                          {item.email.email_id}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900">{item.email.subject}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">{reasonLabel}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-xs text-slate-500">No cases</p>
              )}

              <div className="flex min-h-10 items-center justify-end border-t border-slate-100 px-4 py-1">
                <Link href={route} className="inline-flex min-h-9 items-center text-xs font-semibold text-blue-900 hover:text-blue-700">
                  View all <span aria-hidden="true" className="ml-1">→</span>
                </Link>
              </div>
            </section>
          );
        })}
      </div>
      <div className="flex min-h-12 items-center justify-between gap-3 border-t border-slate-200 px-4 py-2 text-xs">
        <span className="text-slate-500">Backend-supplied review reasons</span>
        <Link href="/cases?status=NEEDS_REVIEW" className="inline-flex min-h-9 items-center font-semibold text-blue-900 hover:text-blue-700">View all <span aria-hidden="true" className="ml-1">→</span></Link>
      </div>
    </section>
  );
}
