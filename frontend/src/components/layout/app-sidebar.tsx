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
    <aside className="border-b border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)] md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-4 md:px-5">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-950 text-[11px] font-bold tracking-[0.12em] text-white shadow-sm ring-1 ring-blue-900/20">
          PS
        </span>
        <span className="text-[15px] font-bold tracking-tight text-slate-950">ProShipping</span>
      </div>
      <nav aria-label="Main navigation" className="grid grid-cols-2 gap-1.5 px-3 py-3 md:flex md:flex-col md:gap-1">
        {navigation.map(({ href, label }) => {
          const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center rounded-md border px-3 py-2 text-sm font-medium ${
                active
                  ? "border-blue-200 bg-blue-50 font-semibold text-blue-950 shadow-sm"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
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
