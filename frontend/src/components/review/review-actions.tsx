"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, createCaseReview } from "@/lib/api";
import {
  buildCaseReviewRequest,
  getReviewActionAvailability,
  reviewActionLabels,
  reviewActionSuccessMessages,
} from "@/lib/human-review-actions";
import { shippingFieldLabels } from "@/lib/human-review-display";
import type { ReviewAction, ReviewSide } from "@/types/human-review";
import type { ShippingField, VerificationCase } from "@/types/verification";

const reviewActions: ReviewAction[] = ["CONFIRM", "CORRECT", "EQUIVALENT", "UNREADABLE", "ADD_NOTE", "RETRY", "ESCALATE", "REQUEST_INFORMATION"];

function ActionButton({ action, active, disabled, tooltip, onClick }: {
  action: ReviewAction;
  active: boolean;
  disabled: boolean;
  tooltip: string;
  onClick: () => void;
}) {
  const tooltipId = `review-action-${action.toLowerCase()}-tooltip`;
  return (
    <span className="group relative inline-flex" tabIndex={disabled ? 0 : undefined} aria-describedby={tooltipId}>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={active}
        aria-describedby={tooltipId}
        onClick={onClick}
        className={`min-h-9 rounded-md border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-blue-900 bg-blue-950 text-white shadow-sm" : "border-slate-300 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-950"}`}
      >
        {reviewActionLabels[action]}
      </button>
      <span id={tooltipId} role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs font-normal leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
        {tooltip}
      </span>
    </span>
  );
}

export function ReviewActions({ item, selectedField }: { item: VerificationCase; selectedField: ShippingField | null }) {
  const router = useRouter();
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [side, setSide] = useState<Exclude<ReviewSide, "BOTH">>(item.bl_attachment ? "BL" : "SI");
  const [correctedValue, setCorrectedValue] = useState("");
  const [note, setNote] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [reviewerAction, setReviewerAction] = useState("");
  const [requestedDecision, setRequestedDecision] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const selectedComparison = item.comparison.find((entry) => entry.field === selectedField);
  const actionAvailability = Object.fromEntries(
    reviewActions.map((candidate) => [candidate, getReviewActionAvailability(item, candidate, selectedField)]),
  ) as Record<ReviewAction, ReturnType<typeof getReviewActionAvailability>>;

  function chooseAction(next: ReviewAction) {
    if (!actionAvailability[next].enabled) return;
    setAction(next);
    setFeedback(null);
    if ((next === "CORRECT" || next === "UNREADABLE") && side === "BL" && !item.bl_attachment && item.si_attachment) setSide("SI");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || submitting || !actionAvailability[action].enabled) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = buildCaseReviewRequest(action, selectedField, { side, correctedValue, note, escalationReason, reviewerAction, requestedDecision, requestReason });
      await createCaseReview(item.email.email_id, payload);
      setFeedback({ tone: "success", message: reviewActionSuccessMessages[action] });
      setCorrectedValue("");
      setNote("");
      setEscalationReason("");
      setReviewerAction("");
      setRequestedDecision("");
      setRequestReason("");
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof ApiError ? error.message : "The review action could not be saved." });
    } finally {
      setSubmitting(false);
    }
  }

  const control = "min-h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-900";
  const currentValue = side === "SI" ? selectedComparison?.si?.raw_value : selectedComparison?.bl?.raw_value;

  return (
    <div>
      <div className="space-y-3">
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Review decision</p>
          <div className="flex flex-wrap gap-2" aria-label="Review decision actions">
            {reviewActions.slice(0, 5).map((candidate) => <ActionButton key={candidate} action={candidate} active={action === candidate} disabled={!actionAvailability[candidate].enabled || submitting} tooltip={actionAvailability[candidate].tooltip} onClick={() => chooseAction(candidate)} />)}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Additional actions</p>
          <div className="flex flex-wrap gap-2" aria-label="Processing and escalation actions">
            {reviewActions.slice(5).map((candidate) => <ActionButton key={candidate} action={candidate} active={action === candidate} disabled={!actionAvailability[candidate].enabled || submitting} tooltip={actionAvailability[candidate].tooltip} onClick={() => chooseAction(candidate)} />)}
          </div>
        </div>
      </div>

      {action && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-md border border-blue-200 bg-white p-3 shadow-sm">
          {["CORRECT", "EQUIVALENT", "UNREADABLE", "ESCALATE", "REQUEST_INFORMATION"].includes(action) && selectedField && <div className="text-xs text-slate-600"><span className="font-medium text-slate-800">Selected field:</span> {shippingFieldLabels[selectedField]}</div>}
          {(action === "CORRECT" || action === "UNREADABLE") && (
            <label className="block text-xs font-medium text-slate-700">Document side
              <select value={side} onChange={(event) => setSide(event.target.value as "SI" | "BL")} className={`mt-1 ${control}`}>
                <option value="SI" disabled={!item.si_attachment}>Shipping Instruction</option>
                <option value="BL" disabled={!item.bl_attachment}>Draft Bill of Lading</option>
              </select>
            </label>
          )}
          {action === "CORRECT" && <><p className="text-xs text-slate-600"><span className="font-medium text-slate-800">Current value:</span> {currentValue ?? "—"}</p><label className="block text-xs font-medium text-slate-700">Corrected value<input required value={correctedValue} onChange={(event) => setCorrectedValue(event.target.value)} className={`mt-1 ${control}`} /></label></>}
          {action === "ESCALATE" && <>
            <label className="block text-xs font-medium text-slate-700">Escalation reason<textarea required value={escalationReason} onChange={(event) => setEscalationReason(event.target.value)} className={`mt-1 min-h-20 py-2 ${control}`} /></label>
            <label className="block text-xs font-medium text-slate-700">Actions already taken<textarea required value={reviewerAction} onChange={(event) => setReviewerAction(event.target.value)} className={`mt-1 min-h-20 py-2 ${control}`} /></label>
            <label className="block text-xs font-medium text-slate-700">Requested supervisor decision<textarea required value={requestedDecision} onChange={(event) => setRequestedDecision(event.target.value)} className={`mt-1 min-h-20 py-2 ${control}`} /></label>
          </>}
          {action === "REQUEST_INFORMATION" && <label className="block text-xs font-medium text-slate-700">Information or clarification required<textarea required value={requestReason} onChange={(event) => setRequestReason(event.target.value)} className={`mt-1 min-h-20 py-2 ${control}`} /></label>}
          {(action === "ADD_NOTE" || ["CORRECT", "EQUIVALENT", "UNREADABLE", "ESCALATE", "REQUEST_INFORMATION"].includes(action)) && <label className="block text-xs font-medium text-slate-700">Note{action !== "ADD_NOTE" && <span className="font-normal text-slate-500"> (optional)</span>}<textarea required={action === "ADD_NOTE"} value={note} onChange={(event) => setNote(event.target.value)} className={`mt-1 min-h-20 py-2 ${control}`} /></label>}
          {action === "RETRY" && <p className="text-xs leading-5 text-slate-600">Retry processing this case? The backend immediately reruns processing and stores the outcome as a separate retry attempt. The original automated result remains unchanged.</p>}
          {action === "EQUIVALENT" && <p className="text-xs leading-5 text-slate-600">The backend records the selected mismatch as equivalent for this case. The automated field result remains unchanged.</p>}
          {action === "ESCALATE" && <p className="text-xs leading-5 text-slate-600">Submitting records the escalation and adds it to Supervisor Escalations. It does not send an email immediately.</p>}
          {action === "REQUEST_INFORMATION" && <p className="text-xs leading-5 text-slate-600">Submitting records the request and adds it to Sender Follow-Up. It does not send an email immediately.</p>}
          {feedback && <p role={feedback.tone === "error" ? "alert" : "status"} className={`text-sm ${feedback.tone === "error" ? "text-red-800" : "text-green-800"}`}>{feedback.message}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} className="min-h-10 rounded-md bg-blue-950 px-4 text-sm font-semibold text-white shadow-sm outline-none hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{submitting ? "Saving..." : action === "RETRY" ? "Run Retry" : reviewActionLabels[action]}</button>
            <button type="button" disabled={submitting} onClick={() => setAction(null)} className="min-h-10 px-2 text-sm text-slate-600 underline underline-offset-4">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
