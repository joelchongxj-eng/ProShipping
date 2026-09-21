import type { Metadata } from "next";
import { ApiErrorState } from "@/components/api-error-state";
import { SubmissionWorkspace } from "@/components/submission/submission-workspace";
import { getCompetitionSubmissionUrl, getSubmissionWorkflow } from "@/lib/api";

export const metadata: Metadata = { title: "Submission" };
export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const workflow = await getSubmissionWorkflow();
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Submission</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Manage supervisor escalations and sender follow-ups created through Human Review.
          </p>
        </header>
        <SubmissionWorkspace workflow={workflow} competitionSubmissionUrl={getCompetitionSubmissionUrl()} />
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Submission</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Outbound communication queues and competition export.</p>
        </header>
        <ApiErrorState error={error} retryHref="/submission" httpTitle="Unable to load submission workflow" />
      </div>
    );
  }
}
