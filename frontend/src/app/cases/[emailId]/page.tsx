import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCase } from "@/lib/cases";
import { isMockMode } from "@/lib/config";
import { ApiError } from "@/lib/api";
import { ApiErrorState } from "@/components/api-error-state";
import { StatusBadge } from "@/components/status-badge";
import { CaseComparison } from "@/components/cases/case-comparison";
import { getCategoryLabel } from "@/components/inbox/inbox-filters";
import { getReviewReasonDisplay } from "@/lib/review-reason";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ emailId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Case ${(await params).emailId}` };
}

export default async function CasePage({ params }: Props) {
  const { emailId } = await params;
  let item;
  try { item = await loadCase(emailId); } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return <ApiErrorState error={error} retryHref={`/cases/${encodeURIComponent(emailId)}`} />;
  }
  const metadata = isMockMode ? (await import("@/data/mock-case-metadata")).mock_case_metadata[emailId] : undefined;
  const isComparison = item.category === "BL_COMPARISON";
  const reviewReason = getReviewReasonDisplay(item.review_reason);

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">Back to Dashboard</Link>
      <header>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-semibold tracking-tight">Case {metadata?.display_id ?? item.email.email_id}</h1>{isComparison && <StatusBadge status={item.status} />}</div>
        <p className="mt-2 break-words text-sm text-slate-700">{item.email.subject}</p>
      </header>
      <dl aria-label="Email information" className="flex flex-wrap gap-x-8 gap-y-3 border-y border-slate-200 py-3 text-xs">
        {[["Email ID", item.email.email_id], ["Sender", item.email.from], ["Received", metadata?.received_at ?? "Not supplied by backend"]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-all text-slate-800">{value}</dd></div>)}
      </dl>
      <p className="text-xs text-slate-500">{isMockMode ? "Demo data" : "Backend data"} · Read-only verification results</p>
      {!isComparison ? <p className="rounded-md border border-slate-200 bg-white p-4 text-sm">{getCategoryLabel(item.category)}: this email does not use the BL comparison workflow.</p> : (
        <>
          {item.status === "NEEDS_REVIEW" && (
            <section aria-labelledby="review-reason-title" className="border-l-2 border-yellow-400 bg-yellow-50 px-3 py-3 text-yellow-950">
              <h2 id="review-reason-title" className="text-sm font-semibold">Human review required</h2>
              <p className="mt-1 text-sm"><span className="font-medium">Review reason:</span> {reviewReason.label}</p>
              <p className="mt-1 text-sm text-yellow-900">{reviewReason.message}</p>
            </section>
          )}
          {item.status === "FAILED" && <div className="border-l-2 border-black bg-gray-100 px-3 py-3"><h2 className="text-sm font-semibold">Processing failed</h2><p className="mt-1 text-sm text-slate-700">Verification is incomplete. Only available extraction data is shown below; unavailable values are not comparison results.</p></div>}
          <CaseComparison key={item.email.email_id} item={item} mockMode={isMockMode} />
        </>
      )}
    </div>
  );
}
