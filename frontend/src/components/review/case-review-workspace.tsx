"use client";

import { useState } from "react";
import { CaseComparison } from "@/components/cases/case-comparison";
import type { ShippingField, VerificationCase } from "@/types/verification";
import { HumanReviewPanel, type HumanReviewData } from "./human-review-panel";

function initialField(item: VerificationCase): ShippingField | null {
  const attentionField = item.comparison.find((entry) => ["mismatch", "needs_review", "missing"].includes(entry.status));
  return (attentionField?.field ?? item.comparison[0]?.field ?? null) as ShippingField | null;
}

export function CaseReviewWorkspace({ item, data, mockMode }: { item: VerificationCase; data: HumanReviewData; mockMode: boolean }) {
  const [selectedField, setSelectedField] = useState<ShippingField | null>(() => initialField(item));
  return (
    <>
      <HumanReviewPanel item={item} data={data} selectedField={selectedField} />
      <CaseComparison item={item} mockMode={mockMode} selectedField={selectedField} onSelectedFieldChange={setSelectedField} />
    </>
  );
}
