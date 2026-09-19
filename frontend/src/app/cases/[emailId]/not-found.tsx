import Link from "next/link";

export default function CaseNotFound() {
  return <div className="space-y-3"><h1 className="text-xl font-semibold">Case not found</h1><p className="text-sm text-slate-600">No case is available for this email ID in the selected data mode. In API mode, the email may not have been processed yet.</p><Link href="/cases" className="text-sm underline">Back to cases</Link></div>;
}
