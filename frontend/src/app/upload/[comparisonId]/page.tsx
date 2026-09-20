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
    <div className="space-y-5">
      <BackLink href="/upload">Back to Manual Upload</BackLink>
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Upload Comparison Result</h1>
          <span className="text-xs font-medium text-slate-500">Status</span>
          <StatusBadge status={result.status} />
        </div>
        <p className="mt-2 break-all font-mono text-xs text-slate-500">Comparison ID: {result.comparison_id}</p>
      </header>

      <dl aria-label="Uploaded documents" className="grid gap-3 border-y border-slate-200 py-3 text-xs sm:grid-cols-2">
        {(["si", "bl"] as const).map((role) => {
          const file = role === "si" ? result.si_file : result.bl_file;
          return (
            <div key={role} className="min-w-0">
              <dt className="text-slate-500">{role === "si" ? "Shipping Instruction" : "Draft Bill of Lading"}</dt>
              <dd className="mt-1 break-all font-medium text-slate-800">{file.filename}</dd>
              <dd className="mt-2"><a href={getUploadAttachmentUrl(result.comparison_id, role)} target="_blank" rel="noreferrer" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">Open original attachment</a></dd>
            </div>
          );
        })}
      </dl>

      {result.review_reason && (
        <section aria-labelledby="upload-review-reason" className="border-l-2 border-yellow-400 bg-yellow-50 px-3 py-3 text-yellow-950">
          <h2 id="upload-review-reason" className="text-sm font-semibold">Review required</h2>
          <p className="mt-1 text-sm"><span className="font-medium">Reason:</span> {reviewReason.label}</p>
          <p className="mt-1 text-sm text-yellow-900">{reviewReason.message}</p>
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
