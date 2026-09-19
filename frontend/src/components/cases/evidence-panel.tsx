import type { FieldComparison } from "@/types/verification";
import { SourceActions } from "./source-actions";
import { ConfidenceDisplay } from "./extracted-value";

export function EvidencePanel({ label, comparison, emailId, mockMode }: { label: string; comparison: FieldComparison; emailId: string; mockMode: boolean }) {
  return (
    <section id="field-evidence" aria-labelledby="evidence-title" className="rounded-md border border-slate-200 bg-white p-4">
      <h2 id="evidence-title" className="text-base font-semibold">Evidence: {label}</h2>
      <SourceActions key={label} emailId={emailId} comparison={comparison} mockMode={mockMode} />
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {([ ["Shipping Instruction", comparison.si], ["Draft Bill of Lading", comparison.bl] ] as const).map(([title, value]) => (
          <div key={title} className="min-w-0 space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            <p className="break-words text-sm">Value: {value?.raw_value || "Unavailable"}</p>
            <ConfidenceDisplay confidence={value?.confidence ?? null} />
            <p className="text-xs text-slate-500">Page: {value?.page ?? "Unavailable"}</p>
            <blockquote className="whitespace-pre-wrap break-words border-l-2 border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{value?.evidence || "No source evidence available."}</blockquote>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-slate-200 pt-3">
        <h3 className="text-xs font-semibold text-slate-600">Comparison reason</h3>
        <p className="mt-1 text-sm leading-6">{comparison.reason || "No comparison reason available."}</p>
      </div>
    </section>
  );
}
