import type { ReviewReason, VerificationCase } from "@/types/verification";

// Display groups only: these do not change a case's backend-supplied status.
export type BoardGroup = "matched" | "mismatch" | "needs_review" | "failed";

export const boardSections: { key: BoardGroup; label: string }[] = [
  { key: "matched", label: "Matched" },
  { key: "mismatch", label: "Mismatch" },
  { key: "needs_review", label: "Needs Review" },
  { key: "failed", label: "Failed" },
];

export const statusStyles: Record<BoardGroup, string> = {
  matched: "border-green-200 bg-green-50 text-green-800",
  mismatch: "border-red-200 bg-red-50 text-red-800",
  needs_review: "border-yellow-300 bg-yellow-50 text-yellow-900",
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
    needs_review: comparisons.filter((item) => item.status === "NEEDS_REVIEW"),
    failed: comparisons.filter((item) => item.status === "FAILED"),
  };
}

export function countReviewReasons(cases: VerificationCase[]): Record<ReviewReason, number> {
  const groups = groupReviewReasonCases(cases);
  return {
    missing_attachment: groups.missing_attachment.length,
    missing_value: groups.missing_value.length,
    unreadable: groups.unreadable.length,
    wrong_doc_type: groups.wrong_doc_type.length,
    low_confidence_extraction: groups.low_confidence_extraction.length,
  };
}

export function groupReviewReasonCases(cases: VerificationCase[]): Record<ReviewReason, VerificationCase[]> {
  return {
    missing_attachment: cases.filter((item) => item.status === "NEEDS_REVIEW" && item.review_reason === "missing_attachment"),
    missing_value: cases.filter((item) => item.status === "NEEDS_REVIEW" && item.review_reason === "missing_value"),
    unreadable: cases.filter((item) => item.status === "NEEDS_REVIEW" && item.review_reason === "unreadable"),
    wrong_doc_type: cases.filter((item) => item.status === "NEEDS_REVIEW" && item.review_reason === "wrong_doc_type"),
    low_confidence_extraction: cases.filter((item) => item.status === "NEEDS_REVIEW" && item.review_reason === "low_confidence_extraction"),
  };
}

export const caseListRoutes: Record<BoardGroup, string> = {
  matched: "/cases?status=MATCH",
  mismatch: "/cases?status=MISMATCH",
  needs_review: "/cases?status=NEEDS_REVIEW",
  failed: "/cases?status=FAILED",
};

export type CaseFilter = { group: BoardGroup | "all"; reviewReason?: ReviewReason };

export function resolveCaseFilter(params: Record<string, string | string[] | undefined>): CaseFilter | "invalid" {
  const { status, review_reason } = params;
  if (Object.keys(params).some((key) => key !== "status" && key !== "review_reason")) return "invalid";
  if (Array.isArray(status) || Array.isArray(review_reason)) return "invalid";
  const normalizedStatus = status?.toUpperCase();
  if (review_reason && normalizedStatus !== "NEEDS_REVIEW") return "invalid";
  const group = normalizedStatus === undefined ? "all"
    : normalizedStatus === "MATCH" ? "matched"
      : normalizedStatus === "MISMATCH" ? "mismatch"
        : normalizedStatus === "NEEDS_REVIEW" ? "needs_review"
          : normalizedStatus === "FAILED" ? "failed"
            : null;
  if (!group) return "invalid";
  const validReasons: ReviewReason[] = ["missing_attachment", "missing_value", "unreadable", "wrong_doc_type", "low_confidence_extraction"];
  if (review_reason && !validReasons.includes(review_reason as ReviewReason)) return "invalid";
  return { group, reviewReason: review_reason as ReviewReason | undefined };
}

export function filterCases(cases: VerificationCase[], filter: CaseFilter): VerificationCase[] {
  const grouped = filter.group === "all" ? cases : groupCases(cases)[filter.group];
  return filter.reviewReason ? grouped.filter((item) => item.review_reason === filter.reviewReason) : grouped;
}
