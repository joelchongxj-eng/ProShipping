import type { VerificationCase } from "@/types/verification";
import { ComparisonResult } from "./comparison-result";

export function CaseComparison({ item, mockMode = false }: { item: VerificationCase; mockMode?: boolean }) {
  if (item.category !== "BL_COMPARISON") return <p className="text-sm text-slate-600">This email does not use the BL comparison workflow.</p>;
  return <ComparisonResult status={item.status} comparison={item.comparison} reviewReason={item.review_reason} sourceContext={{ kind: "case", emailId: item.email.email_id, mockMode }} />;
}
