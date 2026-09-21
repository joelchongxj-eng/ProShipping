import { SummaryStats, type SummaryStatItem } from "@/components/summary-stats";

type DashboardGroup = "matched" | "mismatch" | "needs_review";

export function DashboardSummary({ total, counts }: { total: number; counts: Record<DashboardGroup, number> }) {
  const items: SummaryStatItem[] = [
    { label: "Total Cases", count: total, tone: "neutral" },
    { label: "Matched", count: counts.matched, tone: "success" },
    { label: "Mismatch", count: counts.mismatch, tone: "danger" },
    { label: "Needs Review", count: counts.needs_review, tone: "warning" },
  ];
  return <SummaryStats ariaLabel="Case summary" items={items} columns={4} />;
}
