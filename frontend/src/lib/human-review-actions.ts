import type { CreateHumanReviewRequest, ReviewAction, ReviewSide } from "@/types/human-review";
import type { ShippingField, VerificationCase } from "@/types/verification";

export const reviewActionLabels: Record<ReviewAction, string> = {
  CONFIRM: "Confirm",
  CORRECT: "Correct",
  EQUIVALENT: "Equivalent",
  UNREADABLE: "Unreadable",
  ADD_NOTE: "Add Note",
  RETRY: "Retry",
  ESCALATE: "Escalate",
};

export const reviewActionDescriptions: Record<ReviewAction, string> = {
  CONFIRM: "Confirm the case-level automated verification result.",
  CORRECT: "Replace the selected SI or Draft BL value with a reviewed value.",
  EQUIVALENT: "Accept the selected mismatch as semantically equivalent for this case.",
  UNREADABLE: "Mark the selected SI or Draft BL value as unreadable.",
  ADD_NOTE: "Add a case-level reviewer note without changing the automated result.",
  RETRY: "Run backend reprocessing and record the retry result separately.",
  ESCALATE: "Create a field escalation and immediately attempt supervisor email delivery.",
};

export interface ReviewActionAvailability {
  enabled: boolean;
  tooltip: string;
}

export function getReviewActionAvailability(
  item: VerificationCase,
  action: ReviewAction,
  selectedField: ShippingField | null,
): ReviewActionAvailability {
  if (item.status === "FAILED") {
    return { enabled: false, tooltip: "Failed processing cases are not reviewable in the current backend." };
  }

  if (["CORRECT", "EQUIVALENT", "UNREADABLE", "ESCALATE"].includes(action) && !selectedField) {
    return { enabled: false, tooltip: "Select a comparison field first." };
  }

  if (action === "EQUIVALENT") {
    const comparison = item.comparison.find((entry) => entry.field === selectedField);
    if (comparison?.status !== "mismatch") {
      return { enabled: false, tooltip: "Select a mismatched field first." };
    }
  }

  if (action === "UNREADABLE" && !item.si_attachment && !item.bl_attachment) {
    return { enabled: false, tooltip: "Unreadable requires an available SI or Draft BL attachment." };
  }

  if (["RETRY", "ESCALATE"].includes(action) && !["MISMATCH", "NEEDS_REVIEW"].includes(item.status)) {
    return {
      enabled: false,
      tooltip: action === "RETRY"
        ? "Retry is only available for Mismatch or Needs Review cases."
        : "Escalation is only available for Mismatch or Needs Review cases.",
    };
  }

  return { enabled: true, tooltip: reviewActionDescriptions[action] };
}

export interface ReviewActionFormValues {
  side: Exclude<ReviewSide, "BOTH">;
  correctedValue: string;
  note: string;
  escalationReason: string;
  reviewerAction: string;
  requestedDecision: string;
}

export function buildCaseReviewRequest(
  action: ReviewAction,
  selectedField: ShippingField | null,
  values: ReviewActionFormValues,
): CreateHumanReviewRequest {
  const optionalNote = values.note.trim() ? { note: values.note.trim() } : {};
  if (action === "CONFIRM") return { scope: "CASE", action };
  if (action === "RETRY") return { scope: "CASE", action };
  if (action === "ADD_NOTE") return { scope: "CASE", action, note: values.note.trim() };
  if (!selectedField) throw new Error(`${action} requires a selected field.`);
  if (action === "CORRECT") {
    return {
      scope: "FIELD",
      action,
      field: selectedField,
      side: values.side,
      corrected_value: values.correctedValue.trim(),
      ...optionalNote,
    };
  }
  if (action === "EQUIVALENT") {
    return { scope: "FIELD", action, field: selectedField, side: "BOTH", ...optionalNote };
  }
  if (action === "UNREADABLE") {
    return { scope: "FIELD", action, field: selectedField, side: values.side, ...optionalNote };
  }
  return {
    scope: "FIELD",
    action: "ESCALATE",
    field: selectedField,
    side: "BOTH",
    escalation_reason: values.escalationReason.trim(),
    reviewer_action: values.reviewerAction.trim(),
    requested_decision: values.requestedDecision.trim(),
    ...optionalNote,
  };
}

export const reviewActionSuccessMessages: Record<ReviewAction, string> = {
  CONFIRM: "Review confirmed.",
  CORRECT: "Correction saved.",
  EQUIVALENT: "Values marked equivalent.",
  UNREADABLE: "Value marked unreadable.",
  ADD_NOTE: "Note added.",
  RETRY: "Retry completed. Review the retry history for its result.",
  ESCALATE: "Case escalated. Review the escalation history for email delivery status.",
};
