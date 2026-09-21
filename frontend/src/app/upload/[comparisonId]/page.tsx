import type { Metadata } from "next";
import { ApiError, getUploadAttachmentUrl, getUploadComparison } from "@/lib/api";
import { ApiErrorState } from "@/components/api-error-state";
import { BackLink } from "@/components/navigation/back-link";
import { StatusBadge } from "@/components/status-badge";
import { ComparisonResult } from "@/components/cases/comparison-result";
import { getReviewReasonDisplay } from "@/lib/review-reason";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ comparisonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Upload Comparison ${(await params).comparisonId}` };
}

export default async function UploadComparisonPage({ params }: Props) {
  const { comparisonId } = await params;
  let result;
  try {
    result = await getUploadComparison(comparisonId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div role="alert" className="space-y-3 rounded-md border border-slate-300 bg-white p-4">
          <h1 className="text-xl font-semibold">Upload comparison unavailable</h1>
          <p className="text-sm text-slate-600">Upload comparison not found or has expired. Manual upload results are stored temporarily.</p>
          <BackLink href="/upload">Back to Manual Upload</BackLink>
        </div>
      );
    }
    return <ApiErrorState error={error} retryHref={`/upload/${encodeURIComponent(comparisonId)}`} backHref="/upload" backLabel="Back to Manual Upload" httpTitle="Unable to load upload comparison" />;
  }

  const reviewReason = getReviewReasonDisplay(result.review_reason);
  return (
    <div className="space-y-6">
      <BackLink href="/upload">Back to Manual Upload</BackLink>
      <header className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5">
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Manual verification result</p><h1 className="mt-1 text-xl font-bold tracking-tight">Upload Comparison Result</h1></div>
          <div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">Status</span><StatusBadge status={result.status} /></div>
        </div>
        <p className="px-4 py-3 break-all font-mono text-xs text-slate-500 sm:px-5">Comparison ID: {result.comparison_id}</p>
      </header>

      <dl aria-label="Uploaded documents" className="grid overflow-hidden rounded-md border border-slate-200 bg-slate-200 text-xs shadow-sm sm:grid-cols-2 sm:gap-px">
        {(["si", "bl"] as const).map((role) => {
          const file = role === "si" ? result.si_file : result.bl_file;
          return (
            <div key={role} className="min-w-0 bg-white p-4">
              <dt className="font-semibold uppercase tracking-wide text-slate-500">{role === "si" ? "Shipping Instruction" : "Draft Bill of Lading"}</dt>
              <dd className="mt-1.5 break-all text-sm font-semibold text-slate-800">{file.filename}</dd>
              <dd className="mt-2"><a href={getUploadAttachmentUrl(result.comparison_id, role)} target="_blank" rel="noreferrer" className="font-semibold text-blue-900 hover:text-blue-700">Open original attachment <span aria-hidden="true">↗</span></a></dd>
            </div>
          );
        })}
      </dl>

      {result.review_reason && (
        <section aria-labelledby="upload-review-reason" className="rounded-r-md border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-amber-950">
          <h2 id="upload-review-reason" className="text-sm font-semibold">Review required</h2>
          <p className="mt-1 text-sm"><span className="font-medium">Reason:</span> {reviewReason.label}</p>
          <p className="mt-1 text-sm text-amber-900">{reviewReason.message}</p>
        </section>
      )}

      <p className="text-xs text-slate-500">Backend upload comparison · Temporary result</p>
      <ComparisonResult
        status={result.status}
        comparison={result.comparison}
        reviewReason={result.review_reason}
        sourceContext={{ kind: "upload", comparisonId: result.comparison_id, siFile: result.si_file, blFile: result.bl_file }}
      />
    </div>
  );
}
