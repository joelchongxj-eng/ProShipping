"use client";

import { useState } from "react";
import type { ShippingField, VerificationCase } from "@/types/verification";
import { StatusBadge } from "@/components/status-badge";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import { ExtractedValueDisplay } from "./extracted-value";
import { EvidencePanel } from "./evidence-panel";

const fields: { key: ShippingField; label: string }[] = [
  { key: "shipper", label: "Shipper" },
  { key: "consignee", label: "Consignee" },
  { key: "notify_party", label: "Notify Party" },
  { key: "port_of_loading", label: "Port of Loading" },
  { key: "port_of_discharge", label: "Port of Discharge" },
  { key: "container_count", label: "Container Count" },
  { key: "gross_weight_kg", label: "Gross Weight in Kilograms" },
];

export function CaseComparison({ item, mockMode = false }: { item: VerificationCase; mockMode?: boolean }) {
  const available = item.category === "BL_COMPARISON" ? item.comparison : [];
  const preferred = ["mismatch", "needs_review", "missing"].map((status) => available.findIndex((comparison) => comparison.status === status)).find((index) => index >= 0);
  const [selected, setSelected] = useState(preferred ?? 0);
  const selectedComparison = available[selected];
  const fieldLabel = (field: string) => fields.find(({ key }) => key === field)?.label ?? field;

  if (item.category !== "BL_COMPARISON") return <p className="text-sm text-slate-600">This email does not use the BL comparison workflow.</p>;
  if (available.length === 0) {
    const explanation = item.status === "NEEDS_REVIEW"
      ? getReviewReasonDisplay(item.review_reason).message
      : "Comparison results are not available for this case.";
    return <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">{explanation}</p>;
  }
  return (
    <div className="space-y-4">
      <section aria-labelledby="comparison-title">
        <h2 id="comparison-title" className="text-base font-semibold">{item.status === "FAILED" ? "Available extraction data (partial)" : "SI vs Draft BL comparison"}</h2>
        <p className="mt-1 mb-3 text-xs leading-5 text-slate-500">Select a field to inspect its evidence below. Confidence measures extraction certainty only.</p>
        <table className="block w-full table-fixed border-collapse text-left md:table">
          <caption className="sr-only">Backend comparison results with separate SI and Draft BL extraction values</caption>
          <thead className="hidden bg-slate-100 text-xs text-slate-600 md:table-header-group">
            <tr><th scope="col" className="w-[20%] p-3">Field</th><th scope="col" className="w-[27%] p-3">Shipping Instruction</th><th scope="col" className="w-[27%] p-3">Draft Bill of Lading</th><th scope="col" className="w-[26%] p-3">Status / reason</th></tr>
          </thead>
          <tbody className="block md:table-row-group">
            {available.map((comparison, index) => {
              const key = comparison.field;
              const label = fieldLabel(key);
              const active = selected === index;
              const tone = comparison.status === "mismatch" ? "bg-red-50/60" : comparison.status === "needs_review" ? "bg-yellow-50/60" : comparison.status === "missing" ? "bg-gray-100" : "bg-white";
              return (
                <tr key={`${key}-${index}`} onClick={() => setSelected(index)} data-field={key} data-selected={active} className={`mb-3 block cursor-pointer border border-slate-200 align-top md:mb-0 md:table-row ${tone} ${active ? "outline outline-2 -outline-offset-2 outline-slate-600" : ""}`}>
                  <th scope="row" className="block p-3 md:table-cell">
                    <button type="button" aria-pressed={active} aria-controls="field-evidence" onClick={() => setSelected(index)} className="text-left text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4">{label}</button>
                    {active && <span className="mt-1 block text-xs font-normal text-slate-500">Selected</span>}
                  </th>
                  <td className="block px-3 pb-3 md:table-cell md:pt-3"><span className="mb-1 block text-xs font-semibold text-slate-600 md:hidden">Shipping Instruction</span><ExtractedValueDisplay value={comparison.si} /></td>
                  <td className="block px-3 pb-3 md:table-cell md:pt-3"><span className="mb-1 block text-xs font-semibold text-slate-600 md:hidden">Draft Bill of Lading</span><ExtractedValueDisplay value={comparison.bl} /></td>
                  <td className="block px-3 pb-3 md:table-cell md:pt-3"><StatusBadge status={comparison.status} /><p className="mt-2 text-xs leading-5 text-slate-600">{comparison.reason}</p></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {selectedComparison && <EvidencePanel emailId={item.email.email_id} mockMode={mockMode} label={fieldLabel(selectedComparison.field)} comparison={selectedComparison} />}
    </div>
  );
}
