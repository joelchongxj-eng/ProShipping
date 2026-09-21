export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center border-b border-blue-100 bg-blue-50/80 px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] items-center gap-2.5">
        <span aria-hidden="true" className="size-2 rounded-full bg-blue-800 ring-4 ring-blue-100" />
        <p className="text-sm font-semibold tracking-tight text-slate-700">Shipping document verification</p>
      </div>
    </header>
  );
}
