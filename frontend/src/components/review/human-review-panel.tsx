import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import { formatBackendTimestamp, humanReviewStatusLabels, reviewActionLabels, reviewSideLabels, shippingFieldLabels } from "@/lib/human-review-display";
import type { EscalationAssignmentHistory, HumanReviewHistory, HumanReviewStatus, HumanReviewSummary, RetryAttemptHistory } from "@/types/human-review";
import type { ShippingField, VerificationCase } from "@/types/verification";
import { ReviewActions } from "./review-actions";

export interface HumanReviewData {
  summary: HumanReviewSummary | null;
  history: HumanReviewHistory | null;
  retries: RetryAttemptHistory | null;
  escalations: EscalationAssignmentHistory | null;
  errors?: Partial<Record<"summary" | "history" | "retries" | "escalations", string>>;
}

const reviewStatusStyles: Record<HumanReviewStatus, string> = {
  PENDING: "border-slate-300 bg-slate-50 text-slate-700",
  IN_REVIEW: "border-blue-200 bg-blue-50 text-blue-800",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CORRECTED: "border-blue-200 bg-blue-50 text-blue-800",
  ACCEPTED_EQUIVALENT: "border-emerald-200 bg-emerald-50 text-emerald-800",
  UNREADABLE: "border-amber-200 bg-amber-50 text-amber-900",
  RETRY_REQUESTED: "border-amber-200 bg-amber-50 text-amber-900",
  ESCALATED: "border-purple-300 bg-purple-50 text-purple-800",
  INFORMATION_REQUESTED: "border-blue-200 bg-blue-50 text-blue-800",
};

export function HumanReviewStatusBadge({ status }: { status: HumanReviewStatus }) {
  return <span className={`inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-none tracking-wide ${reviewStatusStyles[status]}`}>{humanReviewStatusLabels[status]}</span>;
}

function SectionError({ message }: { message: string | undefined }) {
  return message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null;
}

function ReviewSummaryContent({ summary }: { summary: HumanReviewSummary }) {
  const reviewedValues = Object.entries(summary.effective_values).filter(([, value]) => value.si.reviewed_value !== null || value.bl.reviewed_value !== null || value.accepted_equivalent);
  return (
    <div className="space-y-4">
      <dl className="grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-slate-50 p-3"><dt className="text-xs font-medium text-slate-500">Human Review Status</dt><dd className="mt-2"><HumanReviewStatusBadge status={summary.review_status} /></dd></div>
        <div className="bg-slate-50 p-3"><dt className="text-xs font-medium text-slate-500">Review Count</dt><dd className="mt-2 text-lg font-bold tabular-nums text-slate-900">{summary.review_count}</dd></div>
        <div className="bg-slate-50 p-3"><dt className="text-xs font-medium text-slate-500">Latest Review</dt><dd className="mt-2 text-sm font-semibold text-slate-800">{summary.latest_review ? reviewActionLabels[summary.latest_review.action] : "No reviews yet"}</dd>{summary.latest_review && <p className="mt-1 text-xs text-slate-500">{formatBackendTimestamp(summary.latest_review.created_at)}</p>}</div>
        <div className="bg-slate-50 p-3"><dt className="text-xs font-medium text-slate-500">Active Escalation</dt><dd className="mt-2 text-sm font-semibold text-slate-800">{summary.is_escalated ? "Yes" : "No"}</dd>{summary.escalation_reason && <p className="mt-1 text-xs leading-5 text-slate-600">{summary.escalation_reason}</p>}{summary.escalated_at && <p className="mt-1 text-xs text-slate-500">{formatBackendTimestamp(summary.escalated_at)}</p>}</div>
      </dl>
      {summary.case_review && <p className="text-sm text-slate-700"><span className="font-medium">Latest case-level decision:</span> {reviewActionLabels[summary.case_review.action]}</p>}
      {summary.field_reviews.length > 0 && <div><h3 className="text-sm font-semibold text-slate-900">Field Review Summary</h3><ul className="mt-2 flex flex-wrap gap-2">{summary.field_reviews.map((review) => <li key={`${review.field}-${review.side}`} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{shippingFieldLabels[review.field]} · {reviewSideLabels[review.side]} · {humanReviewStatusLabels[review.review_status]}</li>)}</ul></div>}
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Effective Values</h3>
        {reviewedValues.length === 0 ? <p className="mt-2 text-sm text-slate-600">No reviewed values yet.</p> : (
          <div className="mt-2 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-2">Field</th><th className="p-2">Side</th><th className="p-2">Automated</th><th className="p-2">Reviewed</th><th className="p-2">Effective</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {reviewedValues.flatMap(([field, value]) => (["si", "bl"] as const).filter((side) => value[side].reviewed_value !== null || value.accepted_equivalent).map((side) => (
                  <tr key={`${field}-${side}`}><th className="p-2 font-medium text-slate-800">{shippingFieldLabels[field as keyof typeof shippingFieldLabels]}</th><td className="p-2 text-slate-600">{side === "si" ? "SI" : "Draft BL"}</td><td className="p-2 text-slate-600">{value[side].automated_value ?? "—"}</td><td className="p-2 text-slate-800">{value[side].reviewed_value ?? (value.accepted_equivalent ? "Accepted equivalent" : "—")}</td><td className="p-2 font-medium text-slate-900">{value[side].effective_value ?? "—"}</td></tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewHistoryContent({ history }: { history: HumanReviewHistory }) {
  if (history.reviews.length === 0) return <p className="text-sm text-slate-600">No review history yet.</p>;
  return <ol className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">{history.reviews.map((record, index) => <li key={record.review_id} className="relative p-3 pl-8 before:absolute before:left-3.5 before:top-4 before:size-2 before:rounded-full before:bg-blue-600"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-semibold text-slate-900"><span className="mr-2 text-[10px] font-medium text-slate-400">#{index + 1}</span>{reviewActionLabels[record.action]}</p><time className="text-xs text-slate-500" dateTime={record.created_at}>{formatBackendTimestamp(record.created_at)}</time></div><p className="mt-1 text-xs text-slate-600">{record.scope === "CASE" ? "Case-level review" : `${record.field ? shippingFieldLabels[record.field] : "Field"}${record.side ? ` · ${reviewSideLabels[record.side]}` : ""}`}</p>{record.original_value !== null && <p className="mt-2 text-xs text-slate-600">Automated value: {record.original_value}</p>}{record.corrected_value !== null && <p className="mt-1 text-xs font-semibold text-slate-800">Corrected value: {record.corrected_value}</p>}{record.note && <p className="mt-2 rounded-r border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700">{record.note}</p>}{record.escalation_reason && <p className="mt-2 text-xs text-purple-800">Escalation: {record.escalation_reason}</p>}{record.request_reason && <p className="mt-2 text-xs text-blue-800">Information requested: {record.request_reason}</p>}</li>)}</ol>;
}

function RetryContent({ retries }: { retries: RetryAttemptHistory }) {
  if (retries.attempts.length === 0) return <p className="text-sm text-slate-600">No retry attempts yet.</p>;
  return <ul className="divide-y divide-slate-200 rounded border border-slate-200">{retries.attempts.map((attempt) => <li key={attempt.retry_id} className="p-3 text-xs"><div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">Attempt {attempt.attempt_number}</span><span className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-medium">{attempt.execution_status}</span></div><p className="mt-2 text-slate-600">Automated status: {attempt.previous_automated_status}{attempt.new_automated_status ? ` → ${attempt.new_automated_status}` : ""}</p>{attempt.started_at && <p className="mt-1 text-slate-500">Started: {formatBackendTimestamp(attempt.started_at)}</p>}{attempt.completed_at && <p className="mt-1 text-slate-500">Completed: {formatBackendTimestamp(attempt.completed_at)}</p>}{attempt.error_reason && <p className="mt-2 text-red-800">{attempt.error_reason}</p>}</li>)}</ul>;
}

function EscalationContent({ history }: { history: EscalationAssignmentHistory }) {
  if (history.assignments.length === 0) return <p className="text-sm text-slate-600">No escalation history yet.</p>;
  return <ul className="divide-y divide-slate-200 rounded border border-slate-200">{history.assignments.map((assignment) => {
    const latestAttempt = assignment.delivery_attempts.at(-1);
    return <li key={assignment.assignment_id} className="p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-slate-900">{assignment.field === null ? "Case-level issue" : shippingFieldLabels[assignment.field]}</span><span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 font-medium text-purple-800">{assignment.delivery_status ?? "Pending delivery"}</span></div><p className="mt-2 text-slate-700">{assignment.escalation_reason}</p><dl className="mt-2 grid gap-2 sm:grid-cols-2"><div><dt className="text-slate-500">SI value</dt><dd className="mt-0.5 text-slate-800">{assignment.si_value ?? "—"}</dd></div><div><dt className="text-slate-500">BL value</dt><dd className="mt-0.5 text-slate-800">{assignment.bl_value ?? "—"}</dd></div><div><dt className="text-slate-500">Actions taken</dt><dd className="mt-0.5 text-slate-800">{assignment.reviewer_action}</dd></div><div><dt className="text-slate-500">Decision requested</dt><dd className="mt-0.5 text-slate-800">{assignment.requested_decision}</dd></div></dl>{assignment.supervisor_email && <p className="mt-2 text-slate-500">Recipient: {assignment.supervisor_email}</p>}{latestAttempt && <p className="mt-1 text-slate-500">Latest delivery attempt: {formatBackendTimestamp(latestAttempt.attempted_at)}</p>}{assignment.delivery_status === "FAILED" && <p className="mt-2 text-red-800">Delivery failed. Resend is available from <Link href="/submission" className="font-medium underline underline-offset-4">Submission</Link>.</p>}</li>;
  })}</ul>;
}

export function HumanReviewPanel({ item, data, selectedField }: { item: VerificationCase; data: HumanReviewData; selectedField: ShippingField | null }) {
  const reviewReason = getReviewReasonDisplay(item.review_reason);
  return (
    <section aria-labelledby="human-review-title" className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-blue-50/50 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Decision workspace</p><h2 id="human-review-title" className="mt-1 text-base font-semibold text-slate-950">Human Review</h2><p className="mt-1 text-xs leading-5 text-slate-600">Automated verification remains unchanged; reviewed and effective values are recorded separately.</p></div>
      <dl className="grid gap-px bg-slate-200 sm:grid-cols-3"><div className="bg-white p-3"><dt className="text-xs font-medium text-slate-500">Automated Status</dt><dd className="mt-2"><StatusBadge status={item.status} /></dd></div><div className="bg-white p-3"><dt className="text-xs font-medium text-slate-500">Human Review Status</dt><dd className="mt-2">{data.summary ? <HumanReviewStatusBadge status={data.summary.review_status} /> : <span className="text-sm text-slate-600">Not available</span>}</dd></div><div className="bg-white p-3"><dt className="text-xs font-medium text-slate-500">Review Reason</dt><dd className="mt-2 text-sm font-medium text-slate-800">{item.review_reason ? reviewReason.label : "—"}</dd></div></dl>
      <div className="space-y-5 p-4 sm:p-5">
        <section aria-labelledby="review-summary-title"><h3 id="review-summary-title" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Review Summary</h3><div className="mt-3">{data.summary ? <ReviewSummaryContent summary={data.summary} /> : <SectionError message={data.errors?.summary ?? "Review summary is not available."} />}</div></section>
        <div className="grid gap-5 xl:grid-cols-2"><section aria-labelledby="review-history-title" className="rounded-md border border-slate-200 bg-slate-50/50 p-3"><h3 id="review-history-title" className="text-sm font-semibold text-slate-900">Review History</h3><div className="mt-2">{data.history ? <ReviewHistoryContent history={data.history} /> : <SectionError message={data.errors?.history ?? "Review history is not available."} />}</div></section><section aria-labelledby="review-actions-title" className="rounded-md border border-blue-200 bg-blue-50/30 p-3"><h3 id="review-actions-title" className="text-sm font-semibold text-slate-900">Review Actions</h3><div className="mt-2"><ReviewActions item={item} selectedField={selectedField} /></div></section></div>
        <div className="grid gap-5 xl:grid-cols-2"><section aria-labelledby="retry-history-title" className="rounded-md border border-slate-200 bg-slate-50/70 p-3"><h3 id="retry-history-title" className="text-sm font-semibold text-slate-900">Retry History</h3><div className="mt-2">{data.retries ? <RetryContent retries={data.retries} /> : <SectionError message={data.errors?.retries ?? "Retry history is not available."} />}</div></section><section aria-labelledby="escalation-history-title" className="rounded-md border border-purple-100 bg-purple-50/40 p-3"><h3 id="escalation-history-title" className="text-sm font-semibold text-slate-900">Escalation History</h3><div className="mt-2">{data.escalations ? <EscalationContent history={data.escalations} /> : <SectionError message={data.errors?.escalations ?? "Escalation history is not available."} />}</div></section></div>
      </div>
    </section>
  );
}
