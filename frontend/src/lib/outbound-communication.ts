import type {
  OutboundDeliverySnapshot,
  SenderOutboundStatus,
  SupervisorOutboundStatus,
} from "@/types/outbound";

function hasNewOrChangedItems(currentItemVersions: string[], includedItemVersions: string[]): boolean {
  const included = new Set(includedItemVersions);
  return currentItemVersions.some((version) => !included.has(version));
}

export function resolveSupervisorOutboundStatus(
  currentItemVersions: string[],
  latestDelivery: OutboundDeliverySnapshot | null,
): SupervisorOutboundStatus {
  if (!latestDelivery) return "NOT_SUBMITTED";
  if (latestDelivery.result === "FAILED") return "FAILED";
  return hasNewOrChangedItems(currentItemVersions, latestDelivery.includedItemVersions)
    ? "UPDATE_REQUIRED"
    : "SUBMITTED";
}

export function resolveSenderOutboundStatus(
  currentItemVersions: string[],
  latestDelivery: OutboundDeliverySnapshot | null,
): SenderOutboundStatus {
  if (!latestDelivery) return "NOT_SENT";
  if (latestDelivery.result === "FAILED") return "FAILED";
  return hasNewOrChangedItems(currentItemVersions, latestDelivery.includedItemVersions)
    ? "UPDATE_REQUIRED"
    : "SENT";
}

export function supervisorActionLabel(status: SupervisorOutboundStatus): string | null {
  if (status === "NOT_SUBMITTED") return "Submit to Supervisor";
  if (status === "UPDATE_REQUIRED") return "Send Update";
  if (status === "FAILED") return "Resend";
  return null;
}

export function senderActionLabel(status: SenderOutboundStatus): string | null {
  if (status === "NOT_SENT") return "Send";
  if (status === "UPDATE_REQUIRED") return "Send Update";
  if (status === "FAILED") return "Resend";
  return null;
}

export function removeCurrentOutboundItem<T extends { itemVersion: string }>(items: T[], itemVersion: string): T[] {
  return items.filter((item) => item.itemVersion !== itemVersion);
}

export function buildSubmissionCaseHref(emailId: string): string {
  return `/cases/${encodeURIComponent(emailId)}?from=${encodeURIComponent("/submission")}`;
}

export function shippingFieldLabel(field: string): string {
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
