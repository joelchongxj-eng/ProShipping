import { mock_inbox_emails } from "@/data/mock-inbox-emails";

export interface InboxMockMetadata {
  receivedAt: string;
  classificationConfidence: number;
}

const existingMetadata = new Map<string, InboxMockMetadata>(
  mock_inbox_emails.map((email) => [email.email_id, {
    receivedAt: email.received_at,
    classificationConfidence: email.classification_confidence,
  }]),
);

function stableHash(value: string): number {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

function fallbackMetadata(emailId: string): InboxMockMetadata {
  const hash = stableHash(emailId);
  const day = 17 + (hash % 3);
  const hour = 8 + (Math.floor(hash / 3) % 9);
  const minute = (Math.floor(hash / 27) % 12) * 5;
  const confidence = (72 + (hash % 27)) / 100;

  return {
    receivedAt: `2026-09-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`,
    classificationConfidence: confidence,
  };
}

/** Mock-only display metadata. It never changes or supplements the backend CaseRecord. */
export function getInboxMockMetadata(emailId: string): InboxMockMetadata {
  return existingMetadata.get(emailId) ?? fallbackMetadata(emailId);
}
