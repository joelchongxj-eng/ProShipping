import type { CaseStatus, FieldStatus } from "@/types/verification";
import { statusStyles } from "@/components/dashboard/dashboard-data";

const labels = { MATCH: "Matched", MISMATCH: "Mismatch", NEEDS_REVIEW: "Needs Review", FAILED: "Failed", match: "Match", mismatch: "Mismatch", needs_review: "Needs Review", missing: "Missing", failed: "Failed" };

export function StatusBadge({ status }: { status: CaseStatus | FieldStatus | "failed" }) {
  const styles = { MATCH: statusStyles.matched, MISMATCH: statusStyles.mismatch, NEEDS_REVIEW: statusStyles.needs_review, FAILED: statusStyles.failed, match: statusStyles.matched, mismatch: statusStyles.mismatch, needs_review: statusStyles.needs_review, missing: "border-slate-200 bg-slate-100 text-slate-700", failed: statusStyles.failed };
  const style = styles[status];
  return <span className={`inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-none tracking-wide ${style}`}>{labels[status]}</span>;
}
