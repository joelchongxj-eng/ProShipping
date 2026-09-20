import type { InboxDisplayRow } from "@/types/inbox";
import type { VerificationCase } from "@/types/verification";

export function mapBackendCasesToInboxRows(cases: VerificationCase[]): InboxDisplayRow[] {
  return cases.map((item) => ({
    email_id: item.email.email_id,
    sender: item.email.from,
    subject: item.email.subject,
    body: item.email.body,
    attachments: item.email.attachments,
    category: item.category,
  }));
}
