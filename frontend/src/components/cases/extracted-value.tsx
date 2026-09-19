import type { ExtractedField } from "@/types/verification";

export function ConfidenceDisplay({ confidence }: { confidence: number | null }) {
  return <span className="block text-xs text-slate-500">Extraction confidence: {confidence === null ? "Unavailable" : `${Math.round(confidence * 100)}%`}</span>;
}

export function ExtractedValueDisplay({ value }: { value: ExtractedField | null }) {
  return (
    <div className="space-y-1 break-words">
      <p className="text-sm text-slate-900">{value?.raw_value || "Value unavailable"}</p>
      <p className="text-xs text-slate-500">Normalized: {value?.normalized_value || "Unavailable"}{value?.unit ? ` ${value.unit}` : ""}</p>
      <ConfidenceDisplay confidence={value?.confidence ?? null} />
    </div>
  );
}
