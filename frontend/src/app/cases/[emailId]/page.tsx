import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCase } from "@/lib/cases";
import { isMockMode } from "@/lib/config";
import { ApiError } from "@/lib/api";
import { ApiErrorState } from "@/components/api-error-state";
import { StatusBadge } from "@/components/status-badge";
import { CaseComparison } from "@/components/cases/case-comparison";
import { getCategoryLabel } from "@/components/inbox/inbox-filters";
import { getReviewReasonDisplay, reviewReasonDisplays, reviewReasons } from "@/lib/review-reason";
import type { ReviewReason } from "@/types/verification";
import { BackLink } from "@/components/navigation/back-link";
import { buildCaseDetailHref, getCaseReturnLabel, resolveCaseReturnHref } from "@/lib/case-navigation";
import { HumanReviewStatusBadge } from "@/components/review/human-review-panel";
import { CaseReviewWorkspace } from "@/components/review/case-review-workspace";
import { emptyHumanReviewData, loadCaseHumanReviewData } from "@/lib/case-detail";
import { usesHumanReviewWorkflow } from "@/lib/case-detail-data";

export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ emailId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Case ${(await params).emailId}` };
}

export default async function CasePage({ params, searchParams }: Props) {
  const { emailId } = await params;
  const returnHref = resolveCaseReturnHref((await searchParams).from);
  const returnLabel = getCaseReturnLabel(returnHref, (value) => (
    reviewReasons.includes(value as ReviewReason) ? reviewReasonDisplays[value as ReviewReason].label : undefined
  ));
  let item;
  try { item = await loadCase(emailId); } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return <ApiErrorState error={error} retryHref={buildCaseDetailHref(emailId, returnHref)} backHref={returnHref} backLabel={returnLabel} />;
  }
  const metadata = isMockMode ? (await import("@/data/mock-case-metadata")).mock_case_metadata[emailId] : undefined;
  const isComparison = item.category === "BL_COMPARISON";
  const reviewReason = getReviewReasonDisplay(item.review_reason);
  const showHumanReview = isComparison && usesHumanReviewWorkflow(item.status);
  const humanReviewData = showHumanReview && !isMockMode ? await loadCaseHumanReviewData(emailId) : emptyHumanReviewData();
  const reviewSummary = humanReviewData.summary;

  return (
    <div className="space-y-5">
      <BackLink href={returnHref}>{returnLabel}</BackLink>
      <header className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-xl font-semibold tracking-tight text-slate-950">Case {metadata?.display_id ?? item.email.email_id}</h1><p className="mt-2 break-words text-sm font-medium text-slate-800">{item.email.subject}</p></div>{isComparison && <StatusBadge status={item.status} />}</div>
        <h2 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Case Information</h2>
        <dl aria-label="Case information" className="mt-2 grid gap-px overflow-hidden rounded border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-3"><dt className="text-xs text-slate-500">Email ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-800">{item.email.email_id}</dd></div>
          <div className="bg-white p-3"><dt className="text-xs text-slate-500">Sender</dt><dd className="mt-1 break-all text-sm text-slate-800">{item.email.from}</dd></div>
          <div className="bg-white p-3"><dt className="text-xs text-slate-500">Category</dt><dd className="mt-1 text-sm font-medium text-slate-800">{getCategoryLabel(item.category)}</dd></div>
          {isComparison && <div className="bg-white p-3"><dt className="text-xs text-slate-500">Automated Status</dt><dd className="mt-1"><StatusBadge status={item.status} /></dd></div>}
          {item.review_reason && <div className="bg-white p-3"><dt className="text-xs text-slate-500">Review Reason</dt><dd className="mt-1 text-sm font-medium text-slate-800">{reviewReason.label}</dd></div>}
          {reviewSummary && <div className="bg-white p-3"><dt className="text-xs text-slate-500">Human Review</dt><dd className="mt-1"><HumanReviewStatusBadge status={reviewSummary.review_status} /></dd></div>}
          {reviewSummary?.is_escalated && <div className="bg-white p-3"><dt className="text-xs text-slate-500">Active Escalation</dt><dd className="mt-1 text-sm font-medium text-purple-800">Active</dd></div>}
          {item.si_attachment && <div className="bg-white p-3"><dt className="text-xs text-slate-500">SI Attachment</dt><dd className="mt-1 break-all text-xs text-slate-800">{item.si_attachment}</dd></div>}
          {item.bl_attachment && <div className="bg-white p-3"><dt className="text-xs text-slate-500">Draft BL Attachment</dt><dd className="mt-1 break-all text-xs text-slate-800">{item.bl_attachment}</dd></div>}
        </dl>
      </header>
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
          {showHumanReview
            ? <CaseReviewWorkspace item={item} data={humanReviewData} mockMode={isMockMode} />
            : <CaseComparison key={item.email.email_id} item={item} mockMode={isMockMode} />}
        </>
      )}
    </div>
  );
}
