import type { Metadata } from "next";
import { InboxQueue } from "@/components/inbox/inbox-queue";
import { ApiErrorState } from "@/components/api-error-state";
import { getCases } from "@/lib/api";
import { mapBackendCasesToInboxRows } from "@/lib/inbox";
import { ProcessInboxButton } from "@/components/inbox/process-inbox-button";

export const metadata: Metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

function InboxHeader() {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Inbox</h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">Incoming emails classified by the document-processing system.</p>
      </div>
      <ProcessInboxButton />
    </div>
  );
}

export default async function Page() {
  let cases;
  try {
    cases = await getCases();
  } catch (error) {
    return <div className="space-y-5"><InboxHeader /><ApiErrorState error={error} retryHref="/inbox" /></div>;
  }

  const emails = mapBackendCasesToInboxRows(cases);
  return (
    <>
      <InboxHeader />
      {emails.length > 0 ? <InboxQueue emails={emails} /> : (
        <section className="mt-5 rounded-md border border-slate-200 bg-white p-5" aria-labelledby="empty-inbox-title">
          <h2 id="empty-inbox-title" className="text-base font-semibold text-slate-950">No processed emails yet</h2>
          <p className="mt-2 text-sm text-slate-600">The backend returned an empty case list. Use Process Inbox to fetch and process available messages.</p>
        </section>
      )}
    </>
  );
}
