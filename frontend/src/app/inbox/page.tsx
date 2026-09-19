import type { Metadata } from "next";
import { InboxQueue } from "@/components/inbox/inbox-queue";
import { mock_inbox_emails } from "@/data/mock-inbox-emails";

export const metadata: Metadata = { title: "Inbox" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Inbox</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Incoming emails classified by the document-processing system.</p>
      <InboxQueue emails={mock_inbox_emails} />
    </>
  );
}
