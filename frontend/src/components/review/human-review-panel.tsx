import { StatusBadge } from "@/components/status-badge";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import type { VerificationCase } from "@/types/verification";

const unavailableActions = ["Correct", "Equivalent", "Unreadable", "Confirm", "Retry", "Escalate", "Add note"];

export function HumanReviewPanel({ item }: { item: VerificationCase }) {
  const reviewReason = getReviewReasonDisplay(item.review_reason);

  return (
    <section aria-labelledby="human-review-title" className="rounded-md border border-slate-300 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 id="human-review-title" className="text-base font-semibold text-slate-950">Human Review</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">Automated verification remains unchanged. Human Review data is shown separately when supplied by the backend.</p>
      </div>

      <dl className="grid gap-px bg-slate-200 sm:grid-cols-3">
        <div className="bg-white p-3"><dt className="text-xs font-medium text-slate-500">Automated Status</dt><dd className="mt-2"><StatusBadge status={item.status} /></dd></div>
        <div className="bg-white p-3"><dt className="text-xs font-medium text-slate-500">Human Review Status</dt><dd className="mt-2 text-sm font-medium text-slate-700">Unavailable from current backend</dd></div>
        <div className="bg-white p-3"><dt className="text-xs font-medium text-slate-500">Review Reason</dt><dd className="mt-2 text-sm font-medium text-slate-800">{item.review_reason ? reviewReason.label : "Not supplied"}</dd></div>
      </dl>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Review Summary</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Effective values, corrections, and active escalations are unavailable because the current backend has no review-summary contract.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Review History</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">No review-history endpoint is available. History is not reconstructed in the frontend.</p>
          </div>
        </div>

        <div aria-describedby="review-actions-note">
          <h3 className="text-sm font-semibold text-slate-900">Review Actions</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {unavailableActions.map((action) => (
              <button key={action} type="button" disabled className="min-h-9 cursor-not-allowed rounded border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-500 disabled:opacity-70">{action}</button>
            ))}
          </div>
          <p id="review-actions-note" className="mt-2 text-xs leading-5 text-slate-500">Actions remain disabled until Person B exposes documented review, retry, escalation, summary, and history endpoints.</p>
        </div>
      </div>
    </section>
  );
}
