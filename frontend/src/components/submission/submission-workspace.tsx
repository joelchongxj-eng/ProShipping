"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { ApiError, resendEscalation } from "@/lib/api";
import {
  buildSubmissionCaseHref,
  removeCurrentOutboundItem,
  shippingFieldLabel,
} from "@/lib/outbound-communication";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import type { EscalationAssignment } from "@/types/human-review";
import type { SupervisorEscalationItem } from "@/types/outbound";

const deliveryStyles = {
  SENT: "border-green-300 bg-green-50 text-green-800",
  FAILED: "border-red-300 bg-red-50 text-red-800",
  NOT_CONFIGURED: "border-yellow-300 bg-yellow-50 text-yellow-900",
  PENDING: "border-slate-300 bg-slate-50 text-slate-700",
};

function DeliveryBadge({ status }: { status: EscalationAssignment["delivery_status"] }) {
  const value = status ?? "PENDING";
  const label = value === "SENT" ? "Sent" : value === "FAILED" ? "Failed" : value === "NOT_CONFIGURED" ? "Not configured" : "Pending";
  return <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${deliveryStyles[value]}`}>{label}</span>;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Not supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function SupervisorEscalations({ initialItems }: { initialItems: SupervisorEscalationItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [removedCount, setRemovedCount] = useState(0);
  const [resending, setResending] = useState(false);
  const [actionError, setActionError] = useState("");
  const failedItems = items.filter((item) => item.assignment?.delivery_status === "FAILED");
  const sentCount = items.filter((item) => item.assignment?.delivery_status === "SENT").length;
  const notConfiguredCount = items.filter((item) => item.assignment?.delivery_status === "NOT_CONFIGURED").length;

  function removeItem(itemVersion: string) {
    setItems((current) => removeCurrentOutboundItem(current, itemVersion));
    setRemovedCount((current) => current + 1);
  }

  async function resendFailed() {
    if (resending || failedItems.length === 0) return;
    setResending(true);
    setActionError("");
    const results = await Promise.allSettled(
      failedItems.map((item) => resendEscalation(item.assignment!.assignment_id)),
    );
    const delivered = new Map<string, EscalationAssignment>();
    results.forEach((result, index) => {
      if (result.status === "fulfilled") delivered.set(failedItems[index].itemVersion, result.value);
    });
    setItems((current) => current.map((item) => (
      delivered.has(item.itemVersion)
        ? { ...item, assignment: delivered.get(item.itemVersion)! }
        : item
    )));
    const rejection = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (rejection) {
      setActionError(rejection.reason instanceof ApiError ? rejection.reason.message : "One or more escalation emails could not be resent.");
    }
    setResending(false);
  }

  return (
    <section aria-labelledby="supervisor-escalations-title" className="overflow-hidden rounded-md border border-slate-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="supervisor-escalations-title" className="text-base font-semibold text-slate-950">Supervisor Escalations</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Cases currently marked as escalated in Human Review. The current backend sends each escalation immediately instead of waiting for a submission batch.</p>
        </div>
        <div className="shrink-0 rounded border border-purple-300 bg-purple-50 px-3 py-2 text-xs text-purple-900">
          <span className="font-semibold">Current delivery model</span>
          <span className="ml-2">Immediate per escalation</span>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs">
        <div className="flex gap-2"><dt className="text-slate-500">Active cases</dt><dd className="font-semibold tabular-nums text-slate-900">{items.length}</dd></div>
        <div className="flex gap-2"><dt className="text-slate-500">Sent</dt><dd className="font-semibold tabular-nums text-green-800">{sentCount}</dd></div>
        <div className="flex gap-2"><dt className="text-slate-500">Failed</dt><dd className="font-semibold tabular-nums text-red-800">{failedItems.length}</dd></div>
        <div className="flex gap-2"><dt className="text-slate-500">Not configured</dt><dd className="font-semibold tabular-nums text-yellow-900">{notConfiguredCount}</dd></div>
      </dl>

      {removedCount > 0 && (
        <p role="status" className="border-b border-slate-200 bg-yellow-50 px-4 py-2 text-xs leading-5 text-yellow-950">
          {removedCount} item{removedCount === 1 ? "" : "s"} removed from this view. This is temporary and does not alter Human Review or escalation history; reloading restores the item.
        </p>
      )}

      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">No cases are currently queued for supervisor escalation.</p>
      ) : (
        <ul className="divide-y divide-slate-200" aria-label="Current supervisor escalations">
          {items.map(({ itemVersion, queueItem, assignment }) => (
            <li key={itemVersion} className="p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-xs font-medium text-slate-600">{queueItem.email_id}</span>
                    <StatusBadge status={queueItem.automated_status} />
                    <span className="inline-flex rounded border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-900">Escalated</span>
                    <DeliveryBadge status={assignment?.delivery_status ?? null} />
                  </div>
                  <h3 className="mt-2 break-words text-sm font-semibold text-slate-950">{queueItem.subject}</h3>
                  <dl className="mt-3 grid gap-x-5 gap-y-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                    <div><dt className="text-slate-500">Review reason</dt><dd className="mt-1 text-slate-800">{queueItem.review_reason ? getReviewReasonDisplay(queueItem.review_reason).label : "Not supplied"}</dd></div>
                    <div><dt className="text-slate-500">Affected field</dt><dd className="mt-1 text-slate-800">{assignment ? shippingFieldLabel(assignment.field) : "Not supplied"}</dd></div>
                    <div><dt className="text-slate-500">SI value</dt><dd className="mt-1 break-words text-slate-800">{assignment?.si_value ?? "Unavailable"}</dd></div>
                    <div><dt className="text-slate-500">BL value</dt><dd className="mt-1 break-words text-slate-800">{assignment?.bl_value ?? "Unavailable"}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-slate-500">Escalation reason</dt><dd className="mt-1 break-words leading-5 text-slate-800">{assignment?.escalation_reason ?? queueItem.active_escalation_reason ?? "Not supplied"}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-slate-500">Requested decision</dt><dd className="mt-1 break-words leading-5 text-slate-800">{assignment?.requested_decision ?? "Not supplied"}</dd></div>
                    <div><dt className="text-slate-500">Recipient</dt><dd className="mt-1 break-all text-slate-800">{assignment?.supervisor_email ?? "Not configured"}</dd></div>
                    <div><dt className="text-slate-500">Latest delivery attempt</dt><dd className="mt-1 text-slate-800">{formatTimestamp(assignment?.delivery_attempts.at(-1)?.attempted_at)}</dd></div>
                  </dl>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={buildSubmissionCaseHref(queueItem.email_id)} className="inline-flex min-h-9 items-center rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50">View Case</Link>
                  <button type="button" onClick={() => removeItem(itemVersion)} aria-label={`Remove ${queueItem.email_id} from the current submission view`} title="Remove from this view" className="inline-flex size-9 items-center justify-center rounded border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">X</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {actionError && <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{actionError}</p>}
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-xs leading-5 text-slate-600">
          Batch submission, included-item tracking, and update detection are awaiting backend integration. Existing sent emails are not edited.
        </p>
        {failedItems.length > 0 ? (
          <button type="button" disabled={resending} onClick={resendFailed} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">
            {resending ? "Resending..." : "Resend"}
          </button>
        ) : (
          <button type="button" disabled className="inline-flex min-h-10 shrink-0 cursor-not-allowed items-center justify-center rounded-md bg-slate-300 px-4 text-sm font-medium text-slate-600">Submit to Supervisor</button>
        )}
      </div>
    </section>
  );
}

function SenderFollowUp() {
  return (
    <section aria-labelledby="sender-follow-up-title" className="overflow-hidden rounded-md border border-slate-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="sender-follow-up-title" className="text-base font-semibold text-slate-950">Sender Follow-Up</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Requests for missing information, corrected documents, or clarification will appear here when the backend exposes a dedicated action and delivery queue.</p>
        </div>
        <span className="shrink-0 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">Awaiting backend integration</span>
      </div>
      <p className="px-4 py-6 text-sm text-slate-500">No cases currently require sender follow-up.</p>
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-xs leading-5 text-slate-600">No recipient, request-information record, fixed sender template, delivery endpoint, or send history is available from the backend.</p>
        <button type="button" disabled className="inline-flex min-h-10 shrink-0 cursor-not-allowed items-center justify-center rounded-md bg-slate-300 px-4 text-sm font-medium text-slate-600">Send</button>
      </div>
    </section>
  );
}

export function SubmissionWorkspace({ supervisorItems, competitionSubmissionUrl }: { supervisorItems: SupervisorEscalationItem[]; competitionSubmissionUrl: string }) {
  return (
    <div className="space-y-5">
      <SupervisorEscalations initialItems={supervisorItems} />
      <SenderFollowUp />
      <section aria-labelledby="competition-submission-title" className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="competition-submission-title" className="text-sm font-semibold text-slate-950">Competition Submission</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">Evaluator JSON is separate from outbound email communication and remains available from the existing backend export.</p>
          </div>
          <a href={competitionSubmissionUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 shrink-0 items-center justify-center rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-100">Open submission JSON</a>
        </div>
      </section>
    </div>
  );
}
