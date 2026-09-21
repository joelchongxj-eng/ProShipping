"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  ApiError,
  createSenderEmailDrafts,
  createSupervisorEmailDraft,
  previewEmailDraft,
  refreshSubmissionWorkflow,
  removeSenderSubmissionItem,
  removeSupervisorSubmissionItem,
  resendSubmissionDispatch,
  sendEmailDraft,
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
  submissionSectionLabel,
} from "@/lib/outbound-communication";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import type { EmailDraft, SubmissionDispatch, SubmissionSection, SubmissionWorkflowResponse } from "@/types/outbound";

const sectionStatusStyles = {
  DRAFT: "border-slate-300 bg-slate-50 text-slate-700",
  SUBMITTED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  UPDATE_REQUIRED: "border-amber-200 bg-amber-50 text-amber-900",
};

const deliveryStyles = {
  SENT: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-red-200 bg-red-50 text-red-800",
  NOT_CONFIGURED: "border-slate-300 bg-slate-100 text-slate-700",
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function EmailComposer({
  drafts,
  activeDraftId,
  phase,
  dispatch,
  pending,
  error,
  onSelectDraft,
  onChange,
  onPreview,
  onEdit,
  onSend,
  onResend,
  onClose,
}: {
  drafts: EmailDraft[];
  activeDraftId: string;
  phase: "edit" | "preview" | "result";
  dispatch: SubmissionDispatch | null;
  pending: boolean;
  error: string;
  onSelectDraft: (draftId: string) => void;
  onChange: (field: "recipient" | "subject" | "body", value: string) => void;
  onPreview: () => void;
  onEdit: () => void;
  onSend: () => void;
  onResend: (dispatchId: string) => void;
  onClose: () => void;
}) {
  const draft = drafts.find((item) => item.draft_id === activeDraftId) ?? drafts[0];
  if (!draft) return null;
  const snapshot = dispatch?.message_snapshots[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="email-composer-title" className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-md border border-slate-300 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">Email workspace</p>
            <h2 id="email-composer-title" className="mt-1 text-lg font-semibold text-slate-950">
              {draft.dispatch_type === "UPDATE" ? "Compose Update" : "Compose Email"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">Review the backend-generated message before delivery.</p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close email composer" className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white text-lg text-slate-600 hover:bg-slate-100 disabled:opacity-60">×</button>
        </header>

        <div className="space-y-4 p-5">
          {drafts.length > 1 && phase === "edit" && (
            <div>
              <label htmlFor="email-draft-group" className="block text-sm font-medium text-slate-800">Sender group</label>
              <select id="email-draft-group" value={draft.draft_id} onChange={(event) => onSelectDraft(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
                {drafts.map((item) => <option key={item.draft_id} value={item.draft_id}>{item.route_recipient} · {item.included_items.length} case{item.included_items.length === 1 ? "" : "s"}</option>)}
              </select>
            </div>
          )}

          {phase === "result" ? (
            <div className={`rounded-md border p-4 ${snapshot?.status === "SENT" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <p className="text-sm font-semibold text-slate-950">Delivery {snapshot?.status === "SENT" ? "sent" : "failed"}</p>
              <p className="mt-1 break-all text-sm text-slate-700">{snapshot?.recipient ?? "Recipient not configured"}</p>
              <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-700">Attempted</dt><dd className="mt-0.5">{formatTimestamp(snapshot?.attempted_at ?? null)}</dd></div>
                <div><dt className="font-semibold text-slate-700">Dispatch ID</dt><dd className="mt-0.5 break-all font-mono">{dispatch?.dispatch_id}</dd></div>
              </dl>
              {snapshot?.error_reason && <p role="alert" className="mt-2 text-sm text-red-800">{snapshot.error_reason}</p>}
              {snapshot?.provider_message_id && <p className="mt-2 font-mono text-xs text-slate-600">Provider ID: {snapshot.provider_message_id}</p>}
            </div>
          ) : phase === "preview" ? (
            <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Type</p><p className="mt-1 text-sm text-slate-900">{draft.dispatch_type === "UPDATE" ? "Update" : "Initial email"}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">To</p><p className="mt-1 break-all text-sm text-slate-900">{draft.recipient}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</p><p className="mt-1 text-sm font-semibold text-slate-950">{draft.subject}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Body</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{draft.body}</p></div>
            </div>
          ) : (
            <form id="email-compose-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); onPreview(); }}>
              <div>
                <label htmlFor="email-recipient" className="block text-sm font-medium text-slate-800">To</label>
                <input id="email-recipient" type="email" required maxLength={320} autoFocus value={draft.recipient} onChange={(event) => onChange("recipient", event.target.value)} className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                {draft.channel === "SENDER" && <p className="mt-1.5 text-xs text-slate-500">Production delivery is restricted to the original sender or the configured demo recipient.</p>}
              </div>
              <div>
                <label htmlFor="email-subject" className="block text-sm font-medium text-slate-800">Subject</label>
                <input id="email-subject" required maxLength={200} value={draft.subject} onChange={(event) => onChange("subject", event.target.value)} className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label htmlFor="email-body" className="block text-sm font-medium text-slate-800">Body</label>
                <textarea id="email-body" required maxLength={50000} rows={12} value={draft.body} onChange={(event) => onChange("body", event.target.value)} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </form>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Includes {draft.included_items.length} case{draft.included_items.length === 1 ? "" : "s"}: {draft.included_items.map((item) => item.target_id).join(", ")}
          </div>
          {error && <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          {phase === "edit" && <button type="submit" form="email-compose-form" disabled={pending} className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-950 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{pending ? "Preparing..." : "Preview"}</button>}
          {phase === "preview" && <>
            <button type="button" onClick={onEdit} disabled={pending} className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60">Back to Edit</button>
            <button type="button" onClick={onSend} disabled={pending} className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-950 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{pending ? "Sending..." : "Send"}</button>
          </>}
          {phase === "result" && <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-950 px-4 text-sm font-semibold text-white hover:bg-blue-800">Close</button>}
          {phase === "result" && dispatch && dispatchCanBeResent(dispatch) && <button type="button" onClick={() => onResend(dispatch.dispatch_id)} disabled={pending} className="inline-flex min-h-10 items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60">{pending ? "Resending..." : "Resend"}</button>}
        </footer>
      </section>
    </div>
  );
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
    <ul className="divide-y divide-slate-200 bg-slate-50/50" aria-label="Dispatch history">
      {[...dispatches].reverse().map((dispatch) => {
        const canResend = dispatchCanBeResent(dispatch);
        return (
          <li key={dispatch.dispatch_id} className="px-4 py-3.5">
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
                    <div key={`${outcome.recipient ?? "unconfigured"}-${index}`} className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded border px-2 py-0.5 font-medium ${deliveryStyles[outcome.status]}`}>{deliveryStatusLabel(outcome.status)}</span>
                        <span className="break-all text-slate-700">{outcome.recipient ?? "Recipient not configured"}</span>
                      </div>
                      {outcome.error_reason && <p className="mt-1 text-slate-600">{outcome.error_reason}</p>}
                    </div>
                  ))}
                </div>
                {dispatch.message_snapshots.map((snapshot, index) => (
                  <details key={`${dispatch.dispatch_id}-message-${index}`} className="mt-3 rounded-md border border-slate-200 bg-white">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">Message to {snapshot.recipient ?? "unconfigured recipient"}</summary>
                    <div className="space-y-2 border-t border-slate-200 px-3 py-3 text-xs text-slate-700">
                      <p><span className="font-semibold">Subject:</span> {snapshot.subject}</p>
                      <p className="whitespace-pre-wrap leading-5">{snapshot.body}</p>
                    </div>
                  </details>
                ))}
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
  onCompose,
  onResend,
}: {
  channel: "supervisor" | "sender";
  section: SubmissionSection;
  pendingAction: string | null;
  onRemove: (channel: "supervisor" | "sender", targetId: string) => void;
  onCompose: (channel: "supervisor" | "sender") => void;
  onResend: (dispatchId: string) => void;
}) {
  const supervisor = channel === "supervisor";
  const title = supervisor ? "Supervisor Escalations" : "Sender Follow-Up";
  const emptyText = supervisor
    ? "No cases are currently queued for supervisor escalation."
    : "No cases currently require sender follow-up.";
  const actionLabel = section.status === "SUBMITTED" ? null : section.status === "UPDATE_REQUIRED" ? "Compose Update" : "Compose Email";

  return (
    <section aria-labelledby={`${channel}-submission-title`} className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id={`${channel}-submission-title`} className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {supervisor
              ? "Cases escalated through Human Review for a supervisor decision."
              : "Information requests grouped and delivered by the backend to each email sender."}
          </p>
        </div>
        <span className={`inline-flex shrink-0 rounded-md border px-2.5 py-1 text-xs font-semibold ${sectionStatusStyles[section.status]}`}>
          {submissionSectionLabel(section.status)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:grid-cols-3">
        <div><dt className="text-slate-500">Active items</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">{section.items.length}</dd></div>
        <div><dt className="text-slate-500">Last sent</dt><dd className="mt-1 font-medium text-slate-900">{formatTimestamp(section.last_sent_at)}</dd></div>
        <div><dt className="text-slate-500">Dispatches</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">{section.dispatches.length}</dd></div>
      </dl>

      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active queue</h3>
        <span className="text-xs font-medium tabular-nums text-slate-500">{section.items.length} waiting</span>
      </div>

      {section.items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-200" aria-label={`${title} items`}>
          {section.items.map((item) => (
            <li key={`${item.target_type}:${item.target_id}`} className="p-4 hover:bg-blue-50/30">
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
                  <Link href={buildSubmissionTargetHref(item.target_type, item.target_id)} className="inline-flex min-h-9 items-center rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-950 hover:bg-blue-100">View Case</Link>
                  <span className="group relative inline-flex">
                    <button
                      type="button"
                      disabled={pendingAction === `remove:${channel}:${item.target_id}`}
                      onClick={() => onRemove(channel, item.target_id)}
                      aria-label={submissionRemoveLabel(item.target_id)}
                      aria-describedby={`remove-${channel}-${item.target_id}-tooltip`}
                      className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
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
              : "Compose and review the backend-generated email before sending."}
        </p>
        {actionLabel && (
          <button
            type="button"
            disabled={submissionActionDisabled(section.status, section.items.length) || pendingAction !== null}
            onClick={() => onCompose(channel)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-blue-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {pendingAction === `compose:${channel}` ? "Preparing..." : actionLabel}
          </button>
        )}
      </div>

      <details className="border-t border-slate-200 bg-slate-50/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          Communication History ({section.dispatches.length})
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
  const [composerDrafts, setComposerDrafts] = useState<EmailDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState("");
  const [composerPhase, setComposerPhase] = useState<"edit" | "preview" | "result">("edit");
  const [composerDispatch, setComposerDispatch] = useState<SubmissionDispatch | null>(null);
  const [composerError, setComposerError] = useState("");

  useEffect(() => setCurrentWorkflow(workflow), [workflow]);
  useEffect(() => {
    if (composerDrafts.length === 0) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pendingAction === null) {
        setComposerDrafts([]);
        setActiveDraftId("");
        setComposerDispatch(null);
        setComposerError("");
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [composerDrafts.length, pendingAction]);

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

  async function handleCompose(channel: "supervisor" | "sender") {
    if (pendingAction) return;
    setPendingAction(`compose:${channel}`);
    setActionError("");
    try {
      const drafts = channel === "supervisor"
        ? [await createSupervisorEmailDraft()]
        : (await createSenderEmailDrafts()).drafts;
      setComposerDrafts(drafts);
      setActiveDraftId(drafts[0]?.draft_id ?? "");
      setComposerPhase("edit");
      setComposerDispatch(null);
      setComposerError("");
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "The email draft could not be created.");
    } finally {
      setPendingAction(null);
    }
  }

  function updateDraftField(field: "recipient" | "subject" | "body", value: string) {
    setComposerDrafts((drafts) => drafts.map((draft) => draft.draft_id === activeDraftId ? { ...draft, [field]: value } : draft));
  }

  async function handlePreview() {
    const draft = composerDrafts.find((item) => item.draft_id === activeDraftId);
    if (!draft || pendingAction) return;
    setPendingAction(`preview:${draft.draft_id}`);
    setComposerError("");
    try {
      const preview = await previewEmailDraft(draft.draft_id, {
        revision: draft.revision,
        recipient: draft.recipient,
        subject: draft.subject,
        body: draft.body,
      });
      setComposerDrafts((drafts) => drafts.map((item) => item.draft_id === preview.draft_id ? preview : item));
      setComposerPhase("preview");
    } catch (error) {
      setComposerError(error instanceof ApiError ? error.message : "The email preview could not be prepared.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDraftSend() {
    const draft = composerDrafts.find((item) => item.draft_id === activeDraftId);
    if (!draft || pendingAction) return;
    setPendingAction(`draft-send:${draft.draft_id}`);
    setComposerError("");
    try {
      const dispatch = await sendEmailDraft(draft.draft_id, draft.revision);
      setComposerDispatch(dispatch);
      setComposerPhase("result");
      setCurrentWorkflow(await refreshSubmissionWorkflow());
      router.refresh();
    } catch (error) {
      setComposerError(error instanceof ApiError ? error.message : "The email could not be sent.");
    } finally {
      setPendingAction(null);
    }
  }

  function closeComposer() {
    if (pendingAction) return;
    setComposerDrafts([]);
    setActiveDraftId("");
    setComposerDispatch(null);
    setComposerError("");
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

  async function handleComposerResend(dispatchId: string) {
    if (pendingAction) return;
    setPendingAction(`resend:${dispatchId}`);
    setComposerError("");
    try {
      const dispatch = await resendSubmissionDispatch(dispatchId);
      setComposerDispatch(dispatch);
      setCurrentWorkflow(await refreshSubmissionWorkflow());
      router.refresh();
    } catch (error) {
      setComposerError(error instanceof ApiError ? error.message : "The failed message could not be resent.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-5">
      {actionError && <p role="alert" className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{actionError}</p>}
      <SubmissionSectionPanel channel="supervisor" section={currentWorkflow.supervisor} pendingAction={pendingAction} onRemove={handleRemove} onCompose={handleCompose} onResend={handleResend} />
      <SubmissionSectionPanel channel="sender" section={currentWorkflow.sender_follow_up} pendingAction={pendingAction} onRemove={handleRemove} onCompose={handleCompose} onResend={handleResend} />
      <section aria-labelledby="competition-submission-title" className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="competition-submission-title" className="text-sm font-semibold text-slate-950">Reports &amp; Exports</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">Export detailed case results or view the official submission JSON.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="/api/detailed-csv-export"
              download
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-950 hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Export Detailed CSV
            </a>
            <a
              href={competitionSubmissionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              View Submission JSON
            </a>
          </div>
        </div>
      </section>
      {composerDrafts.length > 0 && (
        <EmailComposer
          drafts={composerDrafts}
          activeDraftId={activeDraftId}
          phase={composerPhase}
          dispatch={composerDispatch}
          pending={pendingAction !== null}
          error={composerError}
          onSelectDraft={setActiveDraftId}
          onChange={updateDraftField}
          onPreview={() => void handlePreview()}
          onEdit={() => setComposerPhase("edit")}
          onSend={() => void handleDraftSend()}
          onResend={(dispatchId) => void handleComposerResend(dispatchId)}
          onClose={closeComposer}
        />
      )}
    </div>
  );
}
