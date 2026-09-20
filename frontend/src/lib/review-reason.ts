import type { ReviewReason } from "@/types/verification";

export const reviewReasonDisplays: Record<ReviewReason, { label: string; message: string }> = {
  missing_attachment: {
    label: "Missing Attachment",
    message: "Required SI or BL attachment is missing.",
  },
  unreadable: {
    label: "Unreadable Document",
    message: "The document could not be read reliably.",
  },
  wrong_doc_type: {
    label: "Wrong Document Type",
    message: "The attachment is not a valid SI or Draft BL.",
  },
  missing_value: {
    label: "Missing Value",
    message: "One or more required fields could not be extracted.",
  },
};

export const reviewReasons: ReviewReason[] = [
  "missing_attachment",
  "missing_value",
  "unreadable",
  "wrong_doc_type",
];

export function getReviewReasonDisplay(reviewReason: ReviewReason | null | undefined) {
  return reviewReason ? reviewReasonDisplays[reviewReason] : {
    label: "Review required",
    message: "This case requires human review before it can be completed.",
  };
}
