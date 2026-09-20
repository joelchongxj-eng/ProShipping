"use client";

import Link from "next/link";
import { useState } from "react";
import type { InboxDisplayRow } from "@/types/inbox";
import { EmailSummary } from "./email-summary";
import { categoryLabels, getCategoryLabel, defaultFilters, filterEmails, MOCK_CLASSIFICATION_REVIEW_THRESHOLD, type CategoryFilter, type ConfidenceFilter, type InboxFilters } from "./inbox-filters";
import { buildCaseDetailHref } from "@/lib/case-navigation";

function formatMockReceivedAt(value: string): string {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value));
}

export function InboxQueue({ emails }: { emails: InboxDisplayRow[] }) {
  const [filters, setFilters] = useState<InboxFilters>(defaultFilters);
  const [selectedEmail, setSelectedEmail] = useState<InboxDisplayRow | null>(null);
  const shown = filterEmails(emails, filters);
  const dates = [...new Set(emails.map((email) => email.received_at_mock.slice(0, 10)))].sort().reverse();
  const categories = [{ value: "all", label: "All" }, ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))];
  const selectClass = "min-h-10 rounded border border-slate-300 bg-white px-2 text-sm text-slate-800";
  const cellClass = "block min-w-0 px-3 py-2 lg:table-cell lg:py-3";
  const mobileLabel = "mb-1 block text-xs font-medium text-slate-500 lg:hidden";

  return (
    <div className="mt-5 space-y-3">
      <div role="group" aria-label="Email category" className="flex flex-wrap gap-2">
        {categories.map(({ value, label }) => <button key={value} type="button" aria-pressed={filters.category === value} onClick={() => setFilters({ ...filters, category: value as CategoryFilter })} className={`min-h-10 rounded border px-3 text-sm ${filters.category === value ? "border-slate-900 bg-slate-900 font-medium text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{label}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-slate-200 py-3">
        <label className="flex items-center gap-2 text-xs text-slate-600">Received date (M)<select aria-label="Received date, mock data" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} className={selectClass}><option value="all">All dates (M)</option>{dates.map((date) => <option key={date} value={date}>{date} (M)</option>)}</select></label>
        <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">Classification confidence (M)<select aria-label="Classification confidence, mock data" value={filters.confidence} onChange={(event) => setFilters({ ...filters, confidence: event.target.value as ConfidenceFilter })} className={selectClass}><option value="all">All confidence levels (M)</option><option value="high">High (90-100%) (M)</option><option value="medium">Medium (80-&lt;90%) (M)</option><option value="low">Low (&lt;80%) (M)</option></select></label>
        <button type="button" onClick={() => setFilters(defaultFilters)} className="min-h-10 text-xs text-slate-600 underline underline-offset-4">Reset filters</button>
      </div>
      <div className="text-xs text-slate-500"><p role="status">{shown.length} of {emails.length} backend emails</p></div>
      <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">(M)</span> = Mock data used temporarily because this value is not yet provided by the backend.</p>
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="block w-full table-fixed text-left text-sm lg:table">
          <caption className="sr-only">Backend-classified email work queue with temporary mock received time and classification confidence.</caption>
          <thead className="hidden border-b border-slate-200 bg-slate-100 text-xs text-slate-600 lg:table-header-group"><tr>{["Email ID", "Sender", "Subject", "Received (M)", "Category", "Classification confidence (M)", "Action"].map((label) => <th key={label} scope="col" className={`px-3 py-3 font-medium ${label === "Subject" ? "w-[25%]" : label === "Sender" ? "w-[17%]" : ""}`}>{label}</th>)}</tr></thead>
          <tbody className="block lg:table-row-group">
            {shown.map((email) => {
              const uncertain = email.classification_confidence_mock < MOCK_CLASSIFICATION_REVIEW_THRESHOLD;
              return (
                <tr key={email.email_id} data-email-id={email.email_id} className={`grid grid-cols-1 border-b border-slate-200 last:border-b-0 sm:grid-cols-2 lg:table-row ${uncertain ? "bg-yellow-50/60 hover:bg-yellow-50" : "hover:bg-slate-50"}`}>
                  <td className={cellClass}><span className={mobileLabel}>Email ID</span><span className="break-all font-mono text-xs">{email.email_id}</span></td>
                  <td className={cellClass}><span className={mobileLabel}>Sender</span><span className="break-all text-xs text-slate-600">{email.sender}</span></td>
                  <td className={cellClass}><span className={mobileLabel}>Subject</span><span className="break-words font-medium text-slate-900">{email.subject}</span></td>
                  <td className={cellClass}><span className={mobileLabel}>Received (M)</span><time dateTime={email.received_at_mock} title={`${email.received_at_mock} (mock)`} className="text-xs text-slate-600">{formatMockReceivedAt(email.received_at_mock)} <span className="font-semibold">(M)</span></time></td>
                  <td className={cellClass}><span className={mobileLabel}>Predicted category</span><span className="inline-block rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{getCategoryLabel(email.category)}</span></td>
                  <td className={cellClass}><span className={mobileLabel}>Classification confidence (M)</span><span className={`tabular-nums ${uncertain ? "font-semibold text-yellow-900" : "text-slate-700"}`}>{Math.round(email.classification_confidence_mock * 100)}% <span className="font-semibold">(M)</span></span>{uncertain && <span className="mt-1 block text-xs text-yellow-900">Mock confidence requires demo review</span>}</td>
                  <td className={cellClass}>{email.category === "BL_COMPARISON" ? <Link href={buildCaseDetailHref(email.email_id, "/inbox")} className="inline-flex min-h-9 items-center text-xs font-medium text-slate-800 underline underline-offset-4">Open Case</Link> : <button type="button" onClick={() => setSelectedEmail(email)} className="min-h-9 text-xs font-medium text-slate-800 underline underline-offset-4">View Email</button>}</td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr className="block lg:table-row"><td colSpan={7} className="block px-4 py-6 text-sm text-slate-500 lg:table-cell">No emails match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {selectedEmail && <EmailSummary email={selectedEmail} onClose={() => setSelectedEmail(null)} />}
    </div>
  );
}
