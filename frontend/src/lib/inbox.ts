import type { InboxDisplayRow } from "@/types/inbox";
import type { VerificationCase } from "@/types/verification";
import { getInboxMockMetadata } from "@/mocks/inbox-display-metadata";

export function mapBackendCasesToInboxRows(cases: VerificationCase[]): InboxDisplayRow[] {
  return cases.map((item) => {
    const mockMetadata = getInboxMockMetadata(item.email.email_id);
    return {
      email_id: item.email.email_id,
      sender: item.email.from,
      subject: item.email.subject,
      body: item.email.body,
      attachments: item.email.attachments,
      category: item.category,
      received_at_mock: mockMetadata.receivedAt,
      classification_confidence_mock: mockMetadata.classificationConfidence,
    };
  });
}
