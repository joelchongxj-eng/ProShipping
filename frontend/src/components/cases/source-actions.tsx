"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { FieldComparison } from "@/types/verification";
import type { EvidenceSourceContext, SourceDocument, SourceDocumentFormat, SourceHighlight } from "@/types/source";
import { mock_document_sources } from "@/data/mock-document-sources";
import { getCaseAttachmentUrl, getUploadAttachmentUrl } from "@/lib/api";
import { formatSourceLocator } from "@/lib/source-locator";

const SourceViewer = dynamic(() => import("./source-viewer"), { ssr: false, loading: () => <p role="status" className="text-sm">Opening document viewer...</p> });

function sourceFormat(filename: string): SourceDocumentFormat | null {
  const extension = filename.split(".").pop()?.toLocaleLowerCase();
  return extension === "pdf" || extension === "txt" || extension === "docx" || extension === "xlsx"
    ? extension
    : null;
}

function getSources(sourceContext: EvidenceSourceContext): { si: SourceDocument | null; bl: SourceDocument | null } | undefined {
  if (sourceContext.kind === "upload") {
    const build = (role: "si" | "bl"): SourceDocument | null => {
      const file = role === "si" ? sourceContext.siFile : sourceContext.blFile;
      const format = sourceFormat(file.filename);
      return format ? {
        url: getUploadAttachmentUrl(sourceContext.comparisonId, role),
        filename: file.filename,
        format,
      } : null;
    };
    return { si: build("si"), bl: build("bl") };
  }

  const mockSources = sourceContext.mockMode ? mock_document_sources[sourceContext.emailId] : undefined;
  if (!sourceContext.mockMode) {
    const build = (filename: string | null): SourceDocument | null => {
      if (!filename) return null;
      const format = sourceFormat(filename);
      return format ? { url: getCaseAttachmentUrl(sourceContext.emailId, filename), filename, format } : null;
    };
    return { si: build(sourceContext.siAttachment), bl: build(sourceContext.blAttachment) };
  }
  if (!mockSources) return undefined;
  return {
    si: mockSources.si ? { ...mockSources.si, format: "pdf", synthetic: true } : null,
    bl: mockSources.bl ? { ...mockSources.bl, format: "pdf", synthetic: true } : null,
  };
}

export function SourceActions({ sourceContext, comparison }: { sourceContext: EvidenceSourceContext; comparison: FieldComparison }) {
  const [open, setOpen] = useState(false);
  const sources = getSources(sourceContext);

  function buildHighlight(side: "si" | "bl"): SourceHighlight | null {
    const selectedValue = comparison[side];
    return selectedValue ? {
      evidenceText: selectedValue.source?.evidence_text || selectedValue.evidence || null,
      locator: selectedValue.source?.locator ?? null,
      page: selectedValue.source?.page ?? selectedValue.page ?? null,
      reference: formatSourceLocator(selectedValue),
    } : null;
  }

  const highlights = { si: buildHighlight("si"), bl: buildHighlight("bl") };
  const hasSource = Boolean(sources?.si || sources?.bl);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!hasSource} onClick={() => setOpen(true)} aria-describedby={!hasSource ? "source-comparison-unavailable" : undefined} className="min-h-10 rounded border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">View Source Comparison</button>
      </div>
      {!hasSource && <p id="source-comparison-unavailable" className="mt-1 text-xs text-slate-500">Source documents unavailable.</p>}
      {open && sources && <SourceViewer sources={sources} highlights={highlights} field={comparison.field} onClose={() => setOpen(false)} />}
    </div>
  );
}
