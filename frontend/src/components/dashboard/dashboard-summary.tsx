type DashboardGroup = "matched" | "mismatch" | "needs_review";

const dashboardSections: { key: DashboardGroup; label: string }[] = [
  { key: "matched", label: "Matched" },
  { key: "mismatch", label: "Mismatch" },
  { key: "needs_review", label: "Needs Review" },
];

export function DashboardSummary({ total, counts }: { total: number; counts: Record<DashboardGroup, number> }) {
  return (
    <dl aria-label="Case summary" className="flex flex-wrap gap-x-6 gap-y-3 border-y border-slate-200 py-3 text-sm">
      {[{ label: "Total Cases", count: total }, ...dashboardSections.map(({ key, label }) => ({ label, count: counts[key] }))].map(({ label, count }) => (
        <div key={label} className="flex items-center gap-2">
          <dt className="text-slate-600">{label}</dt>
          <dd className="font-semibold tabular-nums text-slate-950">{count}</dd>
        </div>
      ))}
    </dl>
  );
}
