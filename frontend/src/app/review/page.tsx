import type { Metadata } from "next";

export const metadata: Metadata = { title: "Human Review" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Human Review</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Cases requiring human verification and follow-up.</p>
    </>
  );
}
