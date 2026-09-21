import type { ExtractedField } from "@/types/verification";

export function ConfidenceDisplay({ confidence }: { confidence: number | null }) {
  return <span className="block text-[11px] font-medium text-slate-500">Extraction confidence: {confidence === null ? "Unavailable" : `${Math.round(confidence * 100)}%`}</span>;
}

export function ExtractedValueDisplay({ value, emphasized = false }: { value: ExtractedField | null; emphasized?: boolean }) {
  return (
    <div className={`space-y-1.5 break-words ${emphasized ? "rounded-md border border-red-200 bg-white/70 px-2.5 py-2 shadow-sm" : ""}`}>
      <p className="text-sm font-medium leading-5 text-slate-950">{value?.raw_value || "Value unavailable"}</p>
      <p className="text-xs leading-5 text-slate-600"><span className="font-medium text-slate-500">Normalized:</span> {value?.normalized_value || "Unavailable"}{value?.unit ? ` ${value.unit}` : ""}</p>
      <ConfidenceDisplay confidence={value?.confidence ?? null} />
    </div>
  );
}
