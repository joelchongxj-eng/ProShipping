"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, processAllCases } from "@/lib/api";
import type { ProcessInboxResponse } from "@/lib/process-inbox";

function statusLabel(value: string) {
  return value
    .toLocaleLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

export function ProcessInboxButton() {
  const router = useRouter();
  const processing = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessInboxResponse | null>(null);
  const [error, setError] = useState("");

  async function processInbox() {
    if (processing.current) return;
    processing.current = true;
    setIsProcessing(true);
    setResult(null);
    setError("");
    try {
      const response = await processAllCases();
      setResult(response);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Inbox processing failed.");
    } finally {
      processing.current = false;
      setIsProcessing(false);
    }
  }

  const statusCounts = result ? Object.entries(result.status_counts) : [];

  return (
    <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
      <button type="button" disabled={isProcessing} onClick={processInbox} className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500">
        {isProcessing ? "Processing..." : "Process Inbox"}
      </button>
      {result && (
        <div role="status" aria-live="polite" className="max-w-xl text-sm text-emerald-800 sm:text-right">
          <p>Inbox processing completed. {result.processed} cases processed.</p>
          {statusCounts.length > 0 && <p className="mt-1 text-xs text-slate-600">{statusCounts.map(([status, count]) => `${statusLabel(status)}: ${count}`).join(" · ")}</p>}
        </div>
      )}
      {error && <p role="alert" className="max-w-xl text-sm text-red-800 sm:text-right">{error}</p>}
    </div>
  );
}
