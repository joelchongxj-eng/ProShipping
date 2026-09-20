import type { ShippingField, VerificationCase } from "@/types/verification";
import { ComparisonResult } from "./comparison-result";

export function CaseComparison({ item, mockMode = false, selectedField, onSelectedFieldChange }: { item: VerificationCase; mockMode?: boolean; selectedField?: ShippingField | null; onSelectedFieldChange?: (field: ShippingField) => void }) {
  if (item.category !== "BL_COMPARISON") return <p className="text-sm text-slate-600">This email does not use the BL comparison workflow.</p>;
  return <ComparisonResult status={item.status} comparison={item.comparison} reviewReason={item.review_reason} sourceContext={{ kind: "case", emailId: item.email.email_id, mockMode, siAttachment: item.si_attachment ?? null, blAttachment: item.bl_attachment ?? null }} selectedField={selectedField} onSelectedFieldChange={onSelectedFieldChange} />;
}
