import type { HumanReviewStatus, ReviewAction, ReviewSide } from "@/types/human-review";
import type { ShippingField } from "@/types/verification";

export const shippingFieldLabels: Record<ShippingField, string> = {
  shipper: "Shipper",
  consignee: "Consignee",
  notify_party: "Notify Party",
  port_of_loading: "Port of Loading",
  port_of_discharge: "Port of Discharge",
  container_count: "Container Count",
  gross_weight_kg: "Gross Weight",
};

export const reviewActionLabels: Record<ReviewAction, string> = {
  CONFIRM: "Confirmed",
  CORRECT: "Corrected value",
  EQUIVALENT: "Accepted as equivalent",
  UNREADABLE: "Marked unreadable",
  ADD_NOTE: "Added note",
  RETRY: "Requested retry",
  ESCALATE: "Escalated",
  REQUEST_INFORMATION: "Requested information",
};

export const humanReviewStatusLabels: Record<HumanReviewStatus, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  CONFIRMED: "Confirmed",
  CORRECTED: "Corrected",
  ACCEPTED_EQUIVALENT: "Accepted Equivalent",
  UNREADABLE: "Marked Unreadable",
  RETRY_REQUESTED: "Retry Requested",
  ESCALATED: "Escalated",
  INFORMATION_REQUESTED: "Information Requested",
};

export const reviewSideLabels: Record<ReviewSide, string> = {
  SI: "Shipping Instruction",
  BL: "Draft Bill of Lading",
  BOTH: "Both documents",
};

export function formatBackendTimestamp(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}
