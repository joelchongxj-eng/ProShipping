"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { VerificationCase } from "@/types/verification";
import { CaseRow } from "@/components/dashboard/case-row";

export function FilteredCaseList({ cases }: { cases: VerificationCase[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = query ? `${pathname}?${query}` : pathname;

  return (
    <ul aria-label="Matching cases" className="divide-y divide-slate-200">
      {cases.map((item) => (
        <CaseRow key={item.email.email_id} item={item} returnTo={returnTo} prefetch={false} />
      ))}
    </ul>
  );
}
