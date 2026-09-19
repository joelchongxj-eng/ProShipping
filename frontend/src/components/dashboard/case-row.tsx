import Link from "next/link";
import type { VerificationCase } from "@/types/verification";
import { getFieldCounts } from "./dashboard-data";
import { StatusBadge } from "@/components/status-badge";
import { getCategoryLabel } from "@/components/inbox/inbox-filters";
import { isMockMode } from "@/lib/config";
import { mock_case_metadata } from "@/data/mock-case-metadata";

export function CaseRow({ item, compact = false }: { item: VerificationCase; compact?: boolean }) {
  const counts = getFieldCounts(item);
  const issues = [
    counts.mismatch > 0 ? `${counts.mismatch} mismatched field${counts.mismatch === 1 ? "" : "s"}` : null,
    counts.uncertain > 0 ? `${counts.uncertain} uncertain field${counts.uncertain === 1 ? "" : "s"}` : null,
    counts.missing > 0 ? `${counts.missing} missing field${counts.missing === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <li>
      <Link href={`/cases/${encodeURIComponent(item.email.email_id)}`} className={`block px-4 hover:bg-slate-50 focus-visible:-outline-offset-4 ${compact ? "h-[84px] py-2" : "py-4"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-medium text-slate-600">{(isMockMode ? mock_case_metadata[item.email.email_id]?.display_id : null) ?? item.email.email_id}</span>
          {item.category === "BL_COMPARISON" ? <StatusBadge status={item.status} /> : <span className="text-xs">{getCategoryLabel(item.category)}</span>}
        </div>
        <p title={compact ? item.email.subject : undefined} className={`text-sm font-semibold leading-5 text-slate-950 ${compact ? "mt-1 truncate" : "mt-2 break-words"}`}>{item.email.subject}</p>
        {!compact && <p className="mt-1 break-all text-xs text-slate-500">{item.email.email_id}</p>}
        <div className={`flex items-end justify-between gap-3 text-xs leading-5 ${compact ? "mt-0.5" : "mt-3"}`}>
          <span className={compact ? "truncate text-slate-600" : "text-slate-600"}>{item.category !== "BL_COMPARISON" ? "Classification only" : item.status === "FAILED" ? "Processing failed" : issues.length ? issues.join(" · ") : item.comparison.length === 0 ? "No comparison results supplied" : "No field issues reported"}</span>
          {!compact && <span className="shrink-0 font-medium text-slate-800">Open case <span aria-hidden="true">→</span></span>}
        </div>
      </Link>
    </li>
  );
}
