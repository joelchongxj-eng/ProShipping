export type SummaryStatTone = "neutral" | "success" | "danger" | "warning";

export interface SummaryStatItem {
  label: string;
  count: number;
  tone: SummaryStatTone;
}

const toneStyles: Record<SummaryStatTone, string> = {
  neutral: "bg-blue-50/70",
  success: "bg-emerald-50/70",
  danger: "bg-red-50/70",
  warning: "bg-amber-50/80",
};

export function SummaryStats({ ariaLabel, items, columns }: { ariaLabel: string; items: SummaryStatItem[]; columns: 3 | 4 }) {
  const gridColumns = columns === 3 ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4";
  const segmentBorders = columns === 3
    ? "border-b last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
    : "border-r border-b even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 lg:border-r lg:border-b-0 lg:even:border-r lg:last:border-r-0";

  return (
    <dl aria-label={ariaLabel} className={`grid overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm ${gridColumns}`}>
      {items.map(({ label, count, tone }) => (
        <div key={label} className={`flex min-h-16 items-center justify-between gap-3 border-slate-100 px-3 py-3 sm:min-h-20 sm:px-4 ${segmentBorders} ${toneStyles[tone]}`}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="text-xl font-bold tabular-nums tracking-tight text-slate-950">{count}</dd>
        </div>
      ))}
    </dl>
  );
}
