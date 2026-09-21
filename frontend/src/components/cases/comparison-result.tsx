"use client";

import { useState } from "react";
import type { CaseStatus, FieldComparison, ReviewReason, ShippingField } from "@/types/verification";
import type { EvidenceSourceContext } from "@/types/source";
import { StatusBadge } from "@/components/status-badge";
import { getReviewReasonDisplay } from "@/lib/review-reason";
import { ExtractedValueDisplay } from "./extracted-value";
import { EvidencePanel } from "./evidence-panel";
import { comparisonMethodLabels } from "@/lib/source-locator";

const fields: { key: ShippingField; label: string }[] = [
  { key: "shipper", label: "Shipper" },
  { key: "consignee", label: "Consignee" },
  { key: "notify_party", label: "Notify Party" },
  { key: "port_of_loading", label: "Port of Loading" },
  { key: "port_of_discharge", label: "Port of Discharge" },
  { key: "container_count", label: "Container Count" },
  { key: "gross_weight_kg", label: "Gross Weight in Kilograms" },
];

interface ComparisonResultProps {
  status: CaseStatus;
  comparison: FieldComparison[];
  reviewReason?: ReviewReason | null;
  sourceContext: EvidenceSourceContext;
  selectedField?: ShippingField | null;
  onSelectedFieldChange?: (field: ShippingField) => void;
}

export function ComparisonResult({ status, comparison, reviewReason, sourceContext, selectedField, onSelectedFieldChange }: ComparisonResultProps) {
  const preferred = ["mismatch", "needs_review", "missing"]
    .map((candidate) => comparison.findIndex((item) => item.status === candidate))
    .find((index) => index >= 0);
  const [internalSelected, setInternalSelected] = useState(preferred ?? 0);
  const controlledSelected = selectedField === undefined
    ? undefined
    : comparison.findIndex((item) => item.field === selectedField);
  const selected = controlledSelected ?? internalSelected;
  const selectedComparison = comparison[selected];
  const fieldLabel = (field: string) => fields.find(({ key }) => key === field)?.label ?? field;

  if (comparison.length === 0) {
    const explanation = status === "NEEDS_REVIEW"
      ? getReviewReasonDisplay(reviewReason).message
      : "Comparison results are not available.";
    return <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">{explanation}</p>;
  }

  function selectField(index: number) {
    setInternalSelected(index);
    onSelectedFieldChange?.(comparison[index].field as ShippingField);
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby="comparison-title">
        <h2 id="comparison-title" className="text-base font-semibold">{status === "FAILED" ? "Available extraction data (partial)" : "SI vs Draft BL comparison"}</h2>
        <p className="mt-1 mb-3 text-xs leading-5 text-slate-500">Select a field to inspect its evidence below. Confidence measures extraction certainty only.</p>
        <table className="block w-full table-fixed border-collapse text-left md:table">
          <caption className="sr-only">Backend comparison results with separate SI and Draft BL extraction values</caption>
          <thead className="hidden bg-slate-100 text-xs text-slate-600 md:table-header-group">
            <tr><th scope="col" className="w-[20%] p-3">Field</th><th scope="col" className="w-[27%] p-3">Shipping Instruction</th><th scope="col" className="w-[27%] p-3">Draft Bill of Lading</th><th scope="col" className="w-[26%] p-3">Status / reason</th></tr>
          </thead>
          <tbody className="block md:table-row-group">
            {comparison.map((item, index) => {
              const label = fieldLabel(item.field);
              const active = selected === index;
              const tone = item.status === "mismatch" ? "bg-red-50/60" : item.status === "needs_review" ? "bg-yellow-50/60" : item.status === "missing" ? "bg-gray-100" : "bg-green-50/50";
              return (
                <tr key={`${item.field}-${index}`} onClick={() => selectField(index)} data-field={item.field} data-selected={active} className={`mb-3 block cursor-pointer border border-slate-200 align-top md:mb-0 md:table-row ${tone} ${active ? "outline outline-2 -outline-offset-2 outline-slate-600" : ""}`}>
                  <th scope="row" className="block p-3 md:table-cell">
                    <button type="button" aria-pressed={active} aria-controls="field-evidence" onClick={() => selectField(index)} className="text-left text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4">{label}</button>
                    {active && <span className="mt-1 block text-xs font-normal text-slate-500">Selected</span>}
                  </th>
                  <td className="block px-3 pb-3 md:table-cell md:pt-3"><span className="mb-1 block text-xs font-semibold text-slate-600 md:hidden">Shipping Instruction</span><ExtractedValueDisplay value={item.si} emphasized={item.status === "mismatch"} /></td>
                  <td className="block px-3 pb-3 md:table-cell md:pt-3"><span className="mb-1 block text-xs font-semibold text-slate-600 md:hidden">Draft Bill of Lading</span><ExtractedValueDisplay value={item.bl} emphasized={item.status === "mismatch"} /></td>
                  <td className="block px-3 pb-3 md:table-cell md:pt-3">
                    <StatusBadge status={item.status} />
                    {item.comparison_method && <p className="mt-2 text-xs font-medium text-slate-700">{comparisonMethodLabels[item.comparison_method]}</p>}
                    <p className="mt-1 text-xs leading-5 text-slate-600">{item.reason}</p>
                    {item.equivalence_reason && <p className="mt-2 border-l-2 border-slate-300 pl-2 text-xs leading-5 text-slate-600"><span className="font-medium">Equivalence:</span> {item.equivalence_reason}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {selectedComparison && <EvidencePanel label={fieldLabel(selectedComparison.field)} comparison={selectedComparison} sourceContext={sourceContext} />}
    </div>
  );
}
