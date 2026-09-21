import Link from "next/link";
import type { VerificationCase } from "@/types/verification";
import { getFieldCounts } from "./dashboard-data";
import { StatusBadge } from "@/components/status-badge";
import { getCategoryLabel } from "@/components/inbox/inbox-filters";
import { isMockMode } from "@/lib/config";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import { mock_case_metadata } from "@/data/mock-case-metadata";
import { buildCaseDetailHref } from "@/lib/case-navigation";

export function CaseRow({ item, returnTo, compact = false, prefetch = true }: { item: VerificationCase; returnTo: string; compact?: boolean; prefetch?: boolean }) {
  const counts = getFieldCounts(item);
  const reviewReason = item.status === "NEEDS_REVIEW" ? getReviewReasonDisplay(item.review_reason) : null;
  const emptyComparisonMessage = item.status === "NEEDS_REVIEW"
    ? getReviewReasonDisplay(item.review_reason).message
    : "Comparison results are not available";
  const issues = [
    counts.mismatch > 0 ? `${counts.mismatch} mismatched field${counts.mismatch === 1 ? "" : "s"}` : null,
    counts.uncertain > 0 ? `${counts.uncertain} uncertain field${counts.uncertain === 1 ? "" : "s"}` : null,
    counts.missing > 0 ? `${counts.missing} missing field${counts.missing === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <li>
      <Link href={buildCaseDetailHref(item.email.email_id, returnTo)} prefetch={prefetch} className={`group block px-4 hover:bg-blue-50/40 focus-visible:-outline-offset-4 ${compact ? "h-[96px] py-2.5" : "py-4"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-medium text-slate-600">{(isMockMode ? mock_case_metadata[item.email.email_id]?.display_id : null) ?? item.email.email_id}</span>
          {item.category === "BL_COMPARISON" ? <StatusBadge status={item.status} /> : <span className="text-xs">{getCategoryLabel(item.category)}</span>}
        </div>
        <p title={compact ? item.email.subject : undefined} className={`text-sm font-semibold leading-5 text-slate-950 ${compact ? "mt-1 truncate" : "mt-2 break-words"}`}>{item.email.subject}</p>
        {!compact && <p className="mt-1 break-all text-xs text-slate-500">Sender: {item.email.from}</p>}
        {!compact && reviewReason && <p className="mt-2 text-xs font-medium text-amber-900">Review reason: {reviewReason.label}</p>}
        <div className={`flex items-end justify-between gap-3 text-xs leading-5 ${compact ? "mt-0.5" : "mt-3"}`}>
          <span className={compact ? "min-w-0 truncate text-slate-600" : "text-slate-600"}>{compact && <span className="font-medium text-slate-700">{item.email.from} · </span>}{item.category !== "BL_COMPARISON" ? "Classification only" : item.status === "FAILED" ? "Processing failed" : reviewReason ? reviewReason.label : issues.length ? issues.join(" · ") : item.comparison.length === 0 ? emptyComparisonMessage : "No field issues reported"}</span>
          {!compact && <span className="shrink-0 font-semibold text-blue-900 group-hover:text-blue-700">Open case <span aria-hidden="true">→</span></span>}
        </div>
      </Link>
    </li>
  );
}
