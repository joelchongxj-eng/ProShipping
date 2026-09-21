import type { Metadata } from "next";
import { UploadForm } from "@/components/upload/upload-form";

export const metadata: Metadata = { title: "Manual Upload" };

export default function UploadPage() {
  return (
    <div className="space-y-5">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Manual Document Verification</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">Upload one Shipping Instruction and its corresponding Draft Bill of Lading. The backend will extract and compare the seven required shipping fields.</p>
      </header>
      <div className="rounded-r-md border-l-2 border-blue-500 bg-blue-50 px-4 py-2.5 text-xs leading-5 text-blue-950">
        Upload comparisons are temporary and use a separate comparison ID. They are not email-backed cases.
      </div>
      <UploadForm />
    </div>
  );
}
