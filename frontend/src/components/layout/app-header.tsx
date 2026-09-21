export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center border-b border-slate-200 bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] items-center gap-2.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-blue-700" />
        <p className="text-sm font-semibold tracking-tight text-slate-700">Shipping document verification</p>
      </div>
    </header>
  );
}
