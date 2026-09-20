import type { Metadata } from "next";
import { ApiErrorState } from "@/components/api-error-state";
import { HumanReviewQueue } from "@/components/review/human-review-queue";
import { loadCases } from "@/lib/cases";
import { isMockMode } from "@/lib/config";
import { isReviewQueueCase } from "@/lib/human-review";

export const metadata: Metadata = { title: "Human Review" };
export const dynamic = "force-dynamic";

export default async function Page() {
  let cases;
  try {
    cases = (await loadCases()).filter(isReviewQueueCase);
  } catch (error) {
    return <ApiErrorState error={error} retryHref="/review" />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Human Review</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Operational queue for backend-identified mismatches and cases requiring human attention.</p>
      </div>
      <div className="border-l-2 border-slate-400 bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-700">
        Human Review status and actions are unavailable in the current backend contract. Automated status and review reason remain backend data.
      </div>
      <p className="text-xs text-slate-500">{isMockMode ? "Demo cases" : "Backend cases"} · Read-only review queue</p>
      <HumanReviewQueue cases={cases} />
    </div>
  );
}
