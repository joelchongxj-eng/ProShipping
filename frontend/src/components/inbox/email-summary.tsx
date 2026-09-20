"use client";

import { useEffect, useRef } from "react";
import type { InboxDisplayRow } from "@/types/inbox";
import { getCategoryLabel } from "./inbox-filters";

export function EmailSummary({ email, onClose }: { email: InboxDisplayRow; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previousFocus?.focus(); };
  }, []);
  return (
    <dialog ref={ref} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="email-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[94vw] max-w-xl overflow-auto rounded-md border border-slate-300 bg-white p-5 text-slate-900 backdrop:bg-black/40">
      <div className="flex items-start justify-between gap-4"><h2 id="email-title" className="text-lg font-semibold">Email summary</h2><button type="button" onClick={onClose} className="min-h-10 rounded border border-slate-300 px-3 text-sm">Close</button></div>
      <p className="mt-3 break-words text-sm font-semibold">{email.subject}</p>
      <dl className="mt-4 space-y-3 text-sm">{[["Email ID", email.email_id], ["Sender", email.sender], ["Predicted category", getCategoryLabel(email.category)], ["Attachments", email.attachments.length > 0 ? email.attachments.join(", ") : "None"]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-all">{value}</dd></div>)}</dl>
      <div className="mt-4 border-t border-slate-200 pt-3"><h3 className="text-xs font-medium text-slate-500">Email body</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{email.body || "No body supplied by backend."}</p></div>
      <p className="mt-4 text-xs text-slate-500">Sender, subject, category, body, and attachments come from the backend.</p>
    </dialog>
  );
}
