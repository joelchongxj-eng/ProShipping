import type { ExtractedField } from "@/types/verification";

export function ConfidenceDisplay({ confidence }: { confidence: number | null }) {
  return <span className="block text-xs text-slate-500">Extraction confidence: {confidence === null ? "Unavailable" : `${Math.round(confidence * 100)}%`}</span>;
}

export function ExtractedValueDisplay({ value, emphasized = false }: { value: ExtractedField | null; emphasized?: boolean }) {
  return (
    <div className={`space-y-1 break-words ${emphasized ? "rounded border border-red-300 bg-red-50 px-2.5 py-2" : ""}`}>
      <p className="text-sm text-slate-900">{value?.raw_value || "Value unavailable"}</p>
      <p className="text-xs text-slate-500">Normalized: {value?.normalized_value || "Unavailable"}{value?.unit ? ` ${value.unit}` : ""}</p>
      <ConfidenceDisplay confidence={value?.confidence ?? null} />
    </div>
  );
}
