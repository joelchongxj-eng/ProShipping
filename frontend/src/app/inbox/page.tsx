import type { Metadata } from "next";
import { InboxQueue } from "@/components/inbox/inbox-queue";
import { ApiErrorState } from "@/components/api-error-state";
import { getCases } from "@/lib/api";
import { mapBackendCasesToInboxRows } from "@/lib/inbox";

export const metadata: Metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

export default async function Page() {
  let cases;
  try {
    cases = await getCases();
  } catch (error) {
    return <div className="space-y-5"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Inbox</h1><p className="mt-2 text-sm leading-6 text-slate-600">Incoming emails classified by the document-processing system.</p></div><ApiErrorState error={error} retryHref="/inbox" /></div>;
  }

  const emails = mapBackendCasesToInboxRows(cases);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Inbox</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Incoming emails classified by the document-processing system.</p>
      {emails.length > 0 ? <InboxQueue emails={emails} /> : (
        <section className="mt-5 rounded-md border border-slate-200 bg-white p-5" aria-labelledby="empty-inbox-title">
          <h2 id="empty-inbox-title" className="text-base font-semibold text-slate-950">No processed emails yet</h2>
          <p className="mt-2 text-sm text-slate-600">The backend returned an empty case list. Run <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">POST /api/process-all</code>, then reload the Inbox.</p>
        </section>
      )}
    </>
  );
}
