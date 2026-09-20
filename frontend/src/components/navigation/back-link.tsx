import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-offset-2"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4 shrink-0" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.25 10H3.75m0 0 4.5-4.5M3.75 10l4.5 4.5" />
      </svg>
      <span>{children}</span>
    </Link>
  );
}
