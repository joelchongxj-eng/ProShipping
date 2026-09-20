import type { Metadata } from "next";
import { UploadForm } from "@/components/upload/upload-form";

export const metadata: Metadata = { title: "Manual Upload" };

export default function UploadPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Manual Document Verification</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Upload one Shipping Instruction and its corresponding Draft Bill of Lading. The backend will extract and compare the seven required shipping fields.</p>
      </header>
      <div className="border-l-2 border-slate-400 bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-700">
        Upload comparisons are temporary and use a separate comparison ID. They are not email-backed cases.
      </div>
      <UploadForm />
    </div>
  );
}
