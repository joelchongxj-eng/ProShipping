import type { FieldComparison } from "@/types/verification";
import type { EvidenceSourceContext } from "@/types/source";
import { SourceActions } from "./source-actions";
import { ConfidenceDisplay } from "./extracted-value";
import { comparisonMethodLabels, formatSourceLocator } from "@/lib/source-locator";

export function EvidencePanel({ label, comparison, sourceContext }: { label: string; comparison: FieldComparison; sourceContext: EvidenceSourceContext }) {
  return (
    <section id="field-evidence" aria-labelledby="evidence-title" className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-1 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Selected field evidence</p><h2 id="evidence-title" className="mt-1 text-base font-semibold">{label}</h2></div></div>
      <SourceActions key={label} sourceContext={sourceContext} comparison={comparison} />
      <div className="mt-4 grid overflow-hidden rounded-md border border-slate-200 bg-slate-200 md:grid-cols-2 md:gap-px">
        {([ ["Shipping Instruction", comparison.si], ["Draft Bill of Lading", comparison.bl] ] as const).map(([title, value]) => (
          <div key={title} className="min-w-0 space-y-2 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            <p className="break-words text-sm">Value: {value?.raw_value || "Unavailable"}</p>
            <ConfidenceDisplay confidence={value?.confidence ?? null} />
            {formatSourceLocator(value) && <p className="text-xs text-slate-500">Source: {formatSourceLocator(value)}</p>}
            <blockquote className="whitespace-pre-wrap break-words rounded-r-md border-l-2 border-blue-400 bg-blue-50/50 p-3 text-sm leading-6 text-slate-700">{value?.source?.evidence_text || value?.evidence || "No source evidence available."}</blockquote>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-slate-200 pt-3">
        <h3 className="text-xs font-semibold text-slate-600">Comparison reason</h3>
        <p className="mt-1 text-sm leading-6">{comparison.reason || "No comparison reason available."}</p>
        {comparison.comparison_method && <p className="mt-2 text-xs text-slate-600">Method: {comparisonMethodLabels[comparison.comparison_method]}</p>}
        {comparison.equivalence_reason && <p className="mt-2 text-sm leading-6"><span className="font-medium">Equivalence reason:</span> {comparison.equivalence_reason}</p>}
      </div>
    </section>
  );
}
