import type { ReviewReason } from "@/types/verification";

const reviewReasonDisplays: Record<ReviewReason, { label: string; message: string }> = {
  missing_attachment: {
    label: "Missing attachment",
    message: "Required SI or BL attachment is missing.",
  },
  unreadable: {
    label: "Unreadable document",
    message: "The document could not be read reliably.",
  },
  wrong_doc_type: {
    label: "Wrong document type",
    message: "The attachment is not a valid SI or Draft BL.",
  },
  missing_value: {
    label: "Missing value",
    message: "One or more required fields could not be extracted.",
  },
};

export function getReviewReasonDisplay(reviewReason: ReviewReason | null | undefined) {
  return reviewReason ? reviewReasonDisplays[reviewReason] : {
    label: "Review required",
    message: "This case requires human review before it can be completed.",
  };
}
