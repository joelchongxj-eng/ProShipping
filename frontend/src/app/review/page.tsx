import type { Metadata } from "next";
import { ApiErrorState } from "@/components/api-error-state";
import { HumanReviewQueue } from "@/components/review/human-review-queue";
import { loadCases } from "@/lib/cases";
import { isMockMode } from "@/lib/config";
import { getAllReviewQueueItems } from "@/lib/api";
import { isReviewQueueCase, mockCaseToReviewQueueItem } from "@/lib/human-review";

export const metadata: Metadata = { title: "Human Review" };
export const dynamic = "force-dynamic";

export default async function Page() {
  let cases;
  try {
    cases = isMockMode
      ? (await loadCases()).filter(isReviewQueueCase).map(mockCaseToReviewQueueItem)
      : await getAllReviewQueueItems();
  } catch (error) {
    return <ApiErrorState error={error} retryHref="/review" />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-blue-100 bg-blue-50/60 p-4 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Human Review</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">Operational queue for backend-identified mismatches and cases requiring human attention.</p>
      </div>
      <p className="text-xs text-slate-500">{isMockMode ? "Demo cases" : "Backend Human Review queue"}</p>
      <HumanReviewQueue cases={cases} />
    </div>
  );
}
