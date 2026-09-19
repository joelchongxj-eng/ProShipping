import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <a href="#main-content" className="sr-only fixed top-2 left-2 z-50 rounded bg-slate-900 px-4 py-3 text-sm text-white focus:not-sr-only">
        Skip to content
      </a>
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <AppHeader />
        <main id="main-content" tabIndex={-1} className="px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
