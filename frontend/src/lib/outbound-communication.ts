import type { ReviewTargetType } from "@/types/human-review";
import type {
  SubmissionDeliveryStatus,
  SubmissionDispatch,
  SubmissionSectionStatus,
} from "@/types/outbound";

export function buildSubmissionTargetHref(targetType: ReviewTargetType, targetId: string): string {
  if (targetType === "UPLOAD_COMPARISON") return `/upload/${encodeURIComponent(targetId)}`;
  return `/cases/${encodeURIComponent(targetId)}?from=${encodeURIComponent("/submission")}`;
}

export function submissionSectionLabel(status: SubmissionSectionStatus): string {
  if (status === "DRAFT") return "Draft";
  if (status === "SUBMITTED") return "Submitted";
  return "Update Required";
}

export function submissionActionLabel(
  channel: "supervisor" | "sender",
  status: SubmissionSectionStatus,
): string | null {
  if (status === "SUBMITTED") return null;
  if (status === "UPDATE_REQUIRED") return "Send Update";
  return channel === "supervisor" ? "Submit to Supervisor" : "Send to Sender";
}

export function submissionActionDisabled(status: SubmissionSectionStatus, itemCount: number): boolean {
  return status === "DRAFT" && itemCount === 0;
}

export function dispatchCanBeResent(dispatch: SubmissionDispatch): boolean {
  return dispatch.outcomes.some(({ status }) => status === "FAILED" || status === "NOT_CONFIGURED");
}

export function deliveryStatusLabel(status: SubmissionDeliveryStatus): string {
  if (status === "NOT_CONFIGURED") return "Not Configured";
  return status === "SENT" ? "Sent" : "Failed";
}

export const submissionRemoveTooltip = "Remove this case from the current submission list.";

export function submissionRemoveLabel(targetId: string): string {
  return `Remove case ${targetId} from the current submission list`;
}

export async function mutateSubmissionAndReload<T>(
  mutation: () => Promise<unknown>,
  reload: () => Promise<T>,
): Promise<T> {
  await mutation();
  return reload();
}

export function shippingFieldLabel(field: string | null): string {
  if (field === null) return "Case-level issue";
  const labels: Record<string, string> = {
    shipper: "Shipper",
    consignee: "Consignee",
    notify_party: "Notify Party",
    port_of_loading: "Port of Loading",
    port_of_discharge: "Port of Discharge",
    container_count: "Container Count",
    gross_weight_kg: "Gross Weight in Kilograms",
  };
  return labels[field] ?? field;
}
