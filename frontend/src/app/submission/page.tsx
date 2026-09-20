import type { Metadata } from "next";
import { ApiErrorState } from "@/components/api-error-state";
import { SubmissionWorkspace } from "@/components/submission/submission-workspace";
import { getCaseEscalations, getCompetitionSubmissionUrl, getReviewQueue } from "@/lib/api";
import type { HumanReviewQueueItem } from "@/types/human-review";
import type { SupervisorEscalationItem } from "@/types/outbound";

export const metadata: Metadata = { title: "Submission" };
export const dynamic = "force-dynamic";

async function loadEscalatedQueue(): Promise<HumanReviewQueueItem[]> {
  const items: HumanReviewQueueItem[] = [];
  let offset = 0;
  let total = 0;
  do {
    const page = await getReviewQueue({ limit: 100, offset, isEscalated: true });
    items.push(...page.items);
    total = page.total;
    offset += page.items.length;
  } while (items.length < total && offset < total);
  return items;
}

async function loadSupervisorItems(): Promise<SupervisorEscalationItem[]> {
  const queueItems = await loadEscalatedQueue();
  return Promise.all(queueItems.map(async (queueItem) => {
    const history = await getCaseEscalations(queueItem.email_id);
    const assignment = history.assignments.at(-1) ?? null;
    return {
      queueItem,
      assignment,
      itemVersion: assignment ? `${assignment.assignment_id}:${assignment.created_at}` : `${queueItem.email_id}:${queueItem.latest_review_id ?? "active"}`,
    };
  }));
}

export default async function Page() {
  let supervisorItems: SupervisorEscalationItem[];
  let competitionSubmissionUrl: string;
  try {
    [supervisorItems, competitionSubmissionUrl] = await Promise.all([
      loadSupervisorItems(),
      Promise.resolve(getCompetitionSubmissionUrl()),
    ]);
  } catch (error) {
    return (
      <div className="space-y-5">
        <header><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Submission</h1><p className="mt-2 text-sm leading-6 text-slate-600">Outbound communication queues and competition export.</p></header>
        <ApiErrorState error={error} retryHref="/submission" httpTitle="Unable to load outbound communication" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Submission</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Inspect outbound communication selected through Human Review. Automated, Human Review, and delivery statuses remain separate.</p>
      </header>
      <SubmissionWorkspace supervisorItems={supervisorItems} competitionSubmissionUrl={competitionSubmissionUrl} />
    </div>
  );
}
