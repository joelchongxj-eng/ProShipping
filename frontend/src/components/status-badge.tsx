import type { CaseStatus, FieldStatus } from "@/types/verification";
import { statusStyles } from "@/components/dashboard/dashboard-data";

const labels = { MATCH: "Matched", MISMATCH: "Mismatch", NEEDS_REVIEW: "Needs Review", FAILED: "Failed", match: "Match", mismatch: "Mismatch", needs_review: "Needs Review", missing: "Missing", failed: "Failed" };

export function StatusBadge({ status }: { status: CaseStatus | FieldStatus | "failed" }) {
  const styles = { MATCH: statusStyles.matched, MISMATCH: statusStyles.mismatch, NEEDS_REVIEW: statusStyles.needs_review, FAILED: statusStyles.failed, match: statusStyles.matched, mismatch: statusStyles.mismatch, needs_review: statusStyles.needs_review, missing: "border-gray-300 bg-gray-100 text-gray-700", failed: statusStyles.failed };
  const style = styles[status];
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${style}`}>{labels[status]}</span>;
}
