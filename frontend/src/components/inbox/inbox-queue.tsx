"use client";

import Link from "next/link";
import { useState } from "react";
import type { InboxDisplayRow } from "@/types/inbox";
import { EmailSummary } from "./email-summary";
import { categoryLabels, getCategoryLabel, getClassificationReasonDisplay, defaultFilters, filterEmails, type CategoryFilter, type InboxFilters } from "./inbox-filters";
import { buildCaseDetailHref } from "@/lib/case-navigation";

export function InboxQueue({ emails }: { emails: InboxDisplayRow[] }) {
  const [filters, setFilters] = useState<InboxFilters>(defaultFilters);
  const [selectedEmail, setSelectedEmail] = useState<InboxDisplayRow | null>(null);
  const shown = filterEmails(emails, filters);
  const categories = [{ value: "all", label: "All" }, ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))];
  const cellClass = "block min-w-0 px-3 py-2 lg:table-cell lg:py-3";
  const mobileLabel = "mb-1 block text-xs font-medium text-slate-500 lg:hidden";

  return (
    <div className="mt-5 space-y-3">
      <div role="group" aria-label="Email category" className="flex flex-wrap gap-2">
        {categories.map(({ value, label }) => <button key={value} type="button" aria-pressed={filters.category === value} onClick={() => setFilters({ ...filters, category: value as CategoryFilter })} className={`min-h-10 rounded border px-3 text-sm ${filters.category === value ? "border-slate-900 bg-slate-900 font-medium text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{label}</button>)}
      </div>
      <div className="text-xs text-slate-500"><p role="status">{shown.length} of {emails.length} backend emails</p></div>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="block w-full table-fixed text-left text-sm lg:table">
          <caption className="sr-only">Backend-classified email work queue.</caption>
          <thead className="hidden border-b border-slate-200 bg-slate-100 text-xs text-slate-600 lg:table-header-group"><tr>{["Email ID", "Sender", "Subject", "Category", "Classification Reason", "Action"].map((label) => <th key={label} scope="col" className={`px-3 py-3 font-medium ${label === "Classification Reason" ? "w-[28%]" : label === "Subject" ? "w-[24%]" : label === "Sender" ? "w-[16%]" : ""}`}>{label}</th>)}</tr></thead>
          <tbody className="block lg:table-row-group">
            {shown.map((email) => (
              <tr key={email.email_id} data-email-id={email.email_id} className="grid grid-cols-1 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 sm:grid-cols-2 lg:table-row">
                <td className={cellClass}><span className={mobileLabel}>Email ID</span><span className="break-all font-mono text-xs">{email.email_id}</span></td>
                <td className={cellClass}><span className={mobileLabel}>Sender</span><span className="break-all text-xs text-slate-600">{email.sender}</span></td>
                <td className={cellClass}><span className={mobileLabel}>Subject</span><span className="break-words font-medium text-slate-900">{email.subject}</span></td>
                <td className={cellClass}><span className={mobileLabel}>Predicted category</span><span className="inline-block rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{getCategoryLabel(email.category)}</span></td>
                <td className={cellClass}><span className={mobileLabel}>Classification Reason</span><span className="break-words text-xs leading-5 text-slate-600">{getClassificationReasonDisplay(email.classification_reason)}</span></td>
                <td className={cellClass}>{email.category === "BL_COMPARISON" ? <Link href={buildCaseDetailHref(email.email_id, "/inbox")} className="inline-flex min-h-9 items-center text-xs font-medium text-slate-800 underline underline-offset-4">Open Case</Link> : <button type="button" onClick={() => setSelectedEmail(email)} className="min-h-9 text-xs font-medium text-slate-800 underline underline-offset-4">View Email</button>}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr className="block lg:table-row"><td colSpan={6} className="block px-4 py-6 text-sm text-slate-500 lg:table-cell">No emails match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {selectedEmail && <EmailSummary email={selectedEmail} onClose={() => setSelectedEmail(null)} />}
    </div>
  );
}
