type DashboardGroup = "matched" | "mismatch" | "needs_review";

export function DashboardSummary({ total, counts }: { total: number; counts: Record<DashboardGroup, number> }) {
  const items = [
    { label: "Total Cases", count: total, tone: "bg-blue-50/70" },
    { label: "Matched", count: counts.matched, tone: "bg-emerald-50/70" },
    { label: "Mismatch", count: counts.mismatch, tone: "bg-red-50/70" },
    { label: "Needs Review", count: counts.needs_review, tone: "bg-amber-50/80" },
  ];
  return (
    <dl aria-label="Case summary" className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:grid-cols-4">
      {items.map(({ label, count, tone }) => (
        <div key={label} className={`flex min-h-16 items-center justify-between gap-3 border-r border-b border-slate-100 px-3 py-3 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 lg:min-h-20 lg:border-r lg:border-b-0 lg:px-4 lg:even:border-r lg:last:border-r-0 ${tone}`}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="text-xl font-bold tabular-nums tracking-tight text-slate-950">{count}</dd>
        </div>
      ))}
    </dl>
  );
}
