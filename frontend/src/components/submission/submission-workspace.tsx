"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  ApiError,
  refreshSubmissionWorkflow,
  removeSenderSubmissionItem,
  removeSupervisorSubmissionItem,
  resendSubmissionDispatch,
  sendSenderSubmission,
  submitSupervisorSubmission,
  updateSenderSubmission,
  updateSupervisorSubmission,
} from "@/lib/api";
import {
  buildSubmissionTargetHref,
  deliveryStatusLabel,
  dispatchCanBeResent,
  shippingFieldLabel,
  mutateSubmissionAndReload,
  submissionRemoveLabel,
  submissionRemoveTooltip,
  submissionActionDisabled,
  submissionActionLabel,
  submissionSectionLabel,
} from "@/lib/outbound-communication";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import type { SubmissionDispatch, SubmissionSection, SubmissionWorkflowResponse } from "@/types/outbound";

const sectionStatusStyles = {
  DRAFT: "border-slate-300 bg-slate-50 text-slate-700",
  SUBMITTED: "border-green-300 bg-green-50 text-green-800",
  UPDATE_REQUIRED: "border-yellow-300 bg-yellow-50 text-yellow-900",
};

const deliveryStyles = {
  SENT: "border-green-300 bg-green-50 text-green-800",
  FAILED: "border-red-300 bg-red-50 text-red-800",
  NOT_CONFIGURED: "border-yellow-300 bg-yellow-50 text-yellow-900",
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function DispatchHistory({
  dispatches,
  pendingAction,
  onResend,
}: {
  dispatches: SubmissionDispatch[];
  pendingAction: string | null;
  onResend: (dispatchId: string) => void;
}) {
  if (dispatches.length === 0) {
    return <p className="px-4 py-4 text-sm text-slate-500">No dispatch history yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200" aria-label="Dispatch history">
      {[...dispatches].reverse().map((dispatch) => {
        const canResend = dispatchCanBeResent(dispatch);
        return (
          <li key={dispatch.dispatch_id} className="px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">{dispatch.dispatch_type === "INITIAL" ? "Initial send" : dispatch.dispatch_type === "UPDATE" ? "Update" : "Resend"}</span>
                  <span className="font-mono text-[11px] text-slate-500">{dispatch.dispatch_id}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatTimestamp(dispatch.completed_at)} · {dispatch.item_snapshot.length} item{dispatch.item_snapshot.length === 1 ? "" : "s"}
                  {dispatch.added_target_ids.length > 0 ? ` · ${dispatch.added_target_ids.length} added` : ""}
                  {dispatch.removed_target_ids.length > 0 ? ` · ${dispatch.removed_target_ids.length} removed` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {dispatch.outcomes.map((outcome, index) => (
                    <div key={`${outcome.recipient ?? "unconfigured"}-${index}`} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded border px-2 py-0.5 font-medium ${deliveryStyles[outcome.status]}`}>{deliveryStatusLabel(outcome.status)}</span>
                        <span className="break-all text-slate-700">{outcome.recipient ?? "Recipient not configured"}</span>
                      </div>
                      {outcome.error_reason && <p className="mt-1 text-slate-600">{outcome.error_reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
              {canResend && (
                <button
                  type="button"
                  disabled={pendingAction !== null}
                  onClick={() => onResend(dispatch.dispatch_id)}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingAction === `resend:${dispatch.dispatch_id}` ? "Resending..." : "Resend"}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SubmissionSectionPanel({
  channel,
  section,
  pendingAction,
  onRemove,
  onPrimaryAction,
  onResend,
}: {
  channel: "supervisor" | "sender";
  section: SubmissionSection;
  pendingAction: string | null;
  onRemove: (channel: "supervisor" | "sender", targetId: string) => void;
  onPrimaryAction: (channel: "supervisor" | "sender", status: SubmissionSection["status"]) => void;
  onResend: (dispatchId: string) => void;
}) {
  const supervisor = channel === "supervisor";
  const title = supervisor ? "Supervisor Escalations" : "Sender Follow-Up";
  const emptyText = supervisor
    ? "No cases are currently queued for supervisor escalation."
    : "No cases currently require sender follow-up.";
  const actionLabel = submissionActionLabel(channel, section.status);

  return (
    <section aria-labelledby={`${channel}-submission-title`} className="overflow-hidden rounded-md border border-slate-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id={`${channel}-submission-title`} className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {supervisor
              ? "Cases escalated through Human Review for a supervisor decision."
              : "Information requests grouped and delivered by the backend to each email sender."}
          </p>
        </div>
        <span className={`inline-flex shrink-0 rounded border px-2.5 py-1 text-xs font-semibold ${sectionStatusStyles[section.status]}`}>
          {submissionSectionLabel(section.status)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:grid-cols-3">
        <div><dt className="text-slate-500">Active items</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">{section.items.length}</dd></div>
        <div><dt className="text-slate-500">Last sent</dt><dd className="mt-1 font-medium text-slate-900">{formatTimestamp(section.last_sent_at)}</dd></div>
        <div><dt className="text-slate-500">Dispatches</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">{section.dispatches.length}</dd></div>
      </dl>

      {section.items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-200" aria-label={`${title} items`}>
          {section.items.map((item) => (
            <li key={`${item.target_type}:${item.target_id}`} className="p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-xs font-medium text-slate-600">{item.target_id}</span>
                    <StatusBadge status={item.automated_status} />
                    <span className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">{item.target_type === "COMPETITION_CASE" ? "Email case" : "Manual upload"}</span>
                  </div>
                  <h3 className="mt-2 break-words text-sm font-semibold text-slate-950">{item.subject}</h3>
                  <dl className="mt-3 grid gap-x-5 gap-y-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                    {!supervisor && <div><dt className="text-slate-500">Original sender email</dt><dd className="mt-1 break-all text-slate-800">{item.sender_email ?? "Not available"}</dd></div>}
                    <div><dt className="text-slate-500">Review reason</dt><dd className="mt-1 text-slate-800">{item.review_reason ? getReviewReasonDisplay(item.review_reason).label : "Not supplied"}</dd></div>
                    <div><dt className="text-slate-500">Affected field</dt><dd className="mt-1 text-slate-800">{shippingFieldLabel(item.field)}</dd></div>
                    <div><dt className="text-slate-500">SI value</dt><dd className="mt-1 break-words text-slate-800">{item.si_value ?? "Unavailable"}</dd></div>
                    <div><dt className="text-slate-500">Draft BL value</dt><dd className="mt-1 break-words text-slate-800">{item.bl_value ?? "Unavailable"}</dd></div>
                    <div className="sm:col-span-2 xl:col-span-4"><dt className="text-slate-500">{supervisor ? "Escalation reason" : "Request reason"}</dt><dd className="mt-1 break-words leading-5 text-slate-800">{item.reason}</dd></div>
                  </dl>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={buildSubmissionTargetHref(item.target_type, item.target_id)} className="inline-flex min-h-9 items-center rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50">View Case</Link>
                  <span className="group relative inline-flex">
                    <button
                      type="button"
                      disabled={pendingAction === `remove:${channel}:${item.target_id}`}
                      onClick={() => onRemove(channel, item.target_id)}
                      aria-label={submissionRemoveLabel(item.target_id)}
                      aria-describedby={`remove-${channel}-${item.target_id}-tooltip`}
                      className="inline-flex size-9 items-center justify-center rounded border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingAction === `remove:${channel}:${item.target_id}` ? "…" : "X"}
                    </button>
                    <span
                      id={`remove-${channel}-${item.target_id}-tooltip`}
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-56 rounded bg-slate-950 px-2.5 py-2 text-xs font-normal leading-4 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      {submissionRemoveTooltip}
                    </span>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-600">
          {section.status === "SUBMITTED"
            ? supervisor ? "Submitted to Supervisor." : "Sender follow-up sent."
            : section.status === "UPDATE_REQUIRED"
              ? `${section.items.length} case${section.items.length === 1 ? "" : "s"} waiting to be sent.`
              : "The backend builds and sends the fixed email template."}
        </p>
        {actionLabel && (
          <button
            type="button"
            disabled={submissionActionDisabled(section.status, section.items.length) || pendingAction !== null}
            onClick={() => onPrimaryAction(channel, section.status)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {pendingAction === `send:${channel}` ? "Sending..." : actionLabel}
          </button>
        )}
      </div>

      <details className="border-t border-slate-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
          Dispatch History ({section.dispatches.length})
        </summary>
        <DispatchHistory dispatches={section.dispatches} pendingAction={pendingAction} onResend={onResend} />
      </details>
    </section>
  );
}

export function SubmissionWorkspace({ workflow, competitionSubmissionUrl }: { workflow: SubmissionWorkflowResponse; competitionSubmissionUrl: string }) {
  const router = useRouter();
  const [currentWorkflow, setCurrentWorkflow] = useState(workflow);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => setCurrentWorkflow(workflow), [workflow]);

  async function runAction(key: string, action: () => Promise<unknown>) {
    if (pendingAction) return;
    setPendingAction(key);
    setActionError("");
    try {
      const refreshed = await mutateSubmissionAndReload(action, refreshSubmissionWorkflow);
      setCurrentWorkflow(refreshed);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "The submission action could not be completed.");
    } finally {
      setPendingAction(null);
    }
  }

  function handlePrimaryAction(channel: "supervisor" | "sender", status: SubmissionSection["status"]) {
    const action = channel === "supervisor"
      ? status === "DRAFT" ? submitSupervisorSubmission : updateSupervisorSubmission
      : status === "DRAFT" ? sendSenderSubmission : updateSenderSubmission;
    void runAction(`send:${channel}`, action);
  }

  function handleRemove(channel: "supervisor" | "sender", targetId: string) {
    const remove = channel === "supervisor"
      ? removeSupervisorSubmissionItem
      : removeSenderSubmissionItem;
    void runAction(`remove:${channel}:${targetId}`, () => remove(targetId));
  }

  function handleResend(dispatchId: string) {
    void runAction(`resend:${dispatchId}`, () => resendSubmissionDispatch(dispatchId));
  }

  return (
    <div className="space-y-5">
      {actionError && <p role="alert" className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{actionError}</p>}
      <SubmissionSectionPanel channel="supervisor" section={currentWorkflow.supervisor} pendingAction={pendingAction} onRemove={handleRemove} onPrimaryAction={handlePrimaryAction} onResend={handleResend} />
      <SubmissionSectionPanel channel="sender" section={currentWorkflow.sender_follow_up} pendingAction={pendingAction} onRemove={handleRemove} onPrimaryAction={handlePrimaryAction} onResend={handleResend} />
      <section aria-labelledby="competition-submission-title" className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="competition-submission-title" className="text-sm font-semibold text-slate-950">Competition Submission</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">Evaluator JSON remains separate from outbound email communication.</p>
          </div>
          <a href={competitionSubmissionUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 shrink-0 items-center justify-center rounded border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-100">Open submission JSON</a>
        </div>
      </section>
    </div>
  );
}
