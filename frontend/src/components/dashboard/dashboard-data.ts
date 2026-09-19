import type { VerificationCase } from "@/types/verification";

// Display groups only: these do not change a case's backend-supplied status.
export type BoardGroup = "matched" | "mismatch" | "needs_review" | "missing_information" | "failed";

export const boardSections: { key: BoardGroup; label: string }[] = [
  { key: "matched", label: "Matched" },
  { key: "mismatch", label: "Mismatch" },
  { key: "needs_review", label: "Needs Review" },
  { key: "missing_information", label: "Missing Information" },
  { key: "failed", label: "Failed" },
];

export const statusStyles: Record<BoardGroup, string> = {
  matched: "border-green-200 bg-green-50 text-green-800",
  mismatch: "border-red-200 bg-red-50 text-red-800",
  needs_review: "border-yellow-300 bg-yellow-50 text-yellow-900",
  missing_information: "border-gray-300 bg-gray-100 text-gray-700",
  failed: "border-black bg-black text-white",
};

export function getFieldCounts(item: VerificationCase) {
  const fields = item.category === "BL_COMPARISON" ? item.comparison : [];
  return {
    mismatch: fields.filter((field) => field.status === "mismatch").length,
    uncertain: fields.filter((field) => field.status === "needs_review").length,
    missing: fields.filter((field) => field.status === "missing").length,
  };
}

export function groupCases(cases: VerificationCase[]): Record<BoardGroup, VerificationCase[]> {
  const comparisons = cases.filter((item) => item.category === "BL_COMPARISON");
  return {
    matched: comparisons.filter((item) => item.status === "MATCH"),
    mismatch: comparisons.filter((item) => item.status === "MISMATCH"),
    needs_review: comparisons.filter((item) => item.status === "NEEDS_REVIEW" && getFieldCounts(item).missing === 0),
    // Any missing required field is discoverable here. A case with another
    // overall status can also remain in its status section; status is not rewritten.
    missing_information: comparisons.filter((item) => getFieldCounts(item).missing > 0),
    failed: comparisons.filter((item) => item.status === "FAILED"),
  };
}

export const caseListRoutes: Record<BoardGroup, string> = {
  matched: "/cases?status=matched",
  mismatch: "/cases?status=mismatch",
  needs_review: "/cases?status=needs_review",
  missing_information: "/cases?field_status=missing",
  failed: "/cases?status=failed",
};

export function resolveCaseFilter(params: Record<string, string | string[] | undefined>): BoardGroup | "all" | "invalid" {
  const { status, field_status } = params;
  if (Object.keys(params).some((key) => key !== "status" && key !== "field_status")) return "invalid";
  if (status !== undefined && field_status !== undefined) return "invalid";
  if (field_status !== undefined) return field_status === "missing" ? "missing_information" : "invalid";
  if (status === undefined) return "all";
  return status === "matched" || status === "mismatch" || status === "needs_review" || status === "failed" ? status : "invalid";
}
