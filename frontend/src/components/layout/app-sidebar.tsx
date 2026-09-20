"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/review", label: "Human Review" },
  { href: "/upload", label: "Manual Upload" },
  { href: "/submission", label: "Submission" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex h-16 items-center gap-3 px-4 md:px-5">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded bg-slate-900 text-xs font-semibold tracking-wide text-white">
          PS
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-950">ProShipping</span>
      </div>
      <nav aria-label="Main navigation" className="grid grid-cols-2 gap-1 px-3 pb-3 md:flex md:flex-col md:pt-3">
        {navigation.map(({ href, label }) => {
          const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center rounded border-l-2 px-3 py-2 text-sm ${
                active
                  ? "border-slate-900 bg-slate-100 font-semibold text-slate-950"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
