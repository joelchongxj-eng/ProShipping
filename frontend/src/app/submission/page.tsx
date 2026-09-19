import type { Metadata } from "next";

export const metadata: Metadata = { title: "Submission" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Submission</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Verification exports and evaluation results.</p>
    </>
  );
}
