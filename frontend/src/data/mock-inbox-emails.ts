import type { InboxEmail } from "@/types/inbox";
import { mock_verification_cases } from "./mock-verification-cases";
import { mock_case_metadata } from "./mock-case-metadata";

// Reuse existing email metadata; do not duplicate shipment comparisons.
const caseEmails: InboxEmail[] = mock_verification_cases.map((item) => ({
  email_id: item.email.email_id,
  sender: item.email.from,
  subject: item.email.subject,
  received_at: mock_case_metadata[item.email.email_id].received_at,
  category: "BL_COMPARISON",
  classification_confidence: 0.97,
  // Authored demo triage outcome: field-level uncertainty does not imply
  // email-classification uncertainty. The failed case demonstrates processing failure.
  processing_status: item.status === "FAILED" ? "failed" : "processed",
  case_id: item.email.email_id,
}));

export const mock_inbox_emails: InboxEmail[] = [
  ...caseEmails,
  { email_id: "email_triage_015", sender: "exports@selatpaper.example", subject: "Prepare SI for booking PKL-260920", received_at: "2026-09-19T15:00:00+08:00", category: "SI_REQUEST", classification_confidence: 0.96, processing_status: "classified" },
  { email_id: "email_triage_016", sender: "logistics@merantiwood.example", subject: "New shipment instructions for October sailing", received_at: "2026-09-18T10:30:00+08:00", category: "SI_REQUEST", classification_confidence: 0.87, processing_status: "classified" },
  { email_id: "email_triage_017", sender: "accounts@straitspackaging.example", subject: "Clarification on freight invoice INV-260918", received_at: "2026-09-18T14:10:00+08:00", category: "INVOICE_QUERY", classification_confidence: 0.93, processing_status: "classified" },
  { email_id: "email_triage_018", sender: "terminal@klanglogistics.example", subject: "Weekend gate operating hours", received_at: "2026-09-17T09:00:00+08:00", category: "GENERAL", classification_confidence: 0.80, processing_status: "classified" },
  { email_id: "email_triage_019", sender: "offers@bulkmailer.example", subject: "Limited offer: discounted office supplies", received_at: "2026-09-19T07:45:00+08:00", category: "SPAM", classification_confidence: 0.99, processing_status: "classified" },
  { email_id: "email_triage_020", sender: "shipping@mutiararubber.example", subject: "Please check attached shipment notes", received_at: "2026-09-19T15:15:00+08:00", category: "BL_COMPARISON", classification_confidence: 0.64, processing_status: "needs_review" },
  { email_id: "email_triage_021", sender: "ops@nusantarafurnishings.example", subject: "Re: new instructions or amendment to booking", received_at: "2026-09-18T16:40:00+08:00", category: "SI_REQUEST", classification_confidence: 0.79, processing_status: "needs_review" },
];
