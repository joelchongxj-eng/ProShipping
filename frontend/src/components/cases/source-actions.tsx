"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { FieldComparison } from "@/types/verification";
import { mock_document_sources } from "@/data/mock-document-sources";

const SourceViewer = dynamic(() => import("./source-viewer"), { ssr: false, loading: () => <p role="status" className="text-sm">Opening document viewer...</p> });

export function SourceActions({ emailId, comparison, mockMode }: { emailId: string; comparison: FieldComparison; mockMode: boolean }) {
  const [side, setSide] = useState<"si" | "bl" | null>(null);
  // TODO(Person B): attachment paths are not a documented document-download API.
  // Never substitute a demo PDF for a real backend case.
  const sources = mockMode ? mock_document_sources[emailId] : undefined;
  const source = side ? sources?.[side] : null;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-3">
        {(["si", "bl"] as const).map((documentSide) => (
          <div key={documentSide}>
            <button type="button" disabled={!sources?.[documentSide]} onClick={() => setSide(documentSide)} aria-describedby={!sources?.[documentSide] ? `source-unavailable-${documentSide}` : undefined} className="min-h-10 rounded border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">View {documentSide === "si" ? "SI" : "Draft BL"} Source</button>
            {!sources?.[documentSide] && <p id={`source-unavailable-${documentSide}`} className="mt-1 text-xs text-slate-500">Source document unavailable.</p>}
          </div>
        ))}
      </div>
      {side && source && <SourceViewer source={source} title={side === "si" ? "Shipping Instruction" : "Draft Bill of Lading"} initialPage={comparison[side]?.page ?? null} onClose={() => setSide(null)} />}
    </div>
  );
}
