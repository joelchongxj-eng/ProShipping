import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#eef3f8] md:flex">
      <a href="#main-content" className="sr-only fixed top-2 left-2 z-[70] rounded-md bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg focus:not-sr-only">
        Skip to content
      </a>
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <AppHeader />
        <main id="main-content" tabIndex={-1} className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1680px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
