"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFPageProxy } from "pdfjs-dist";
import type { SourceDocument, SourceHighlight } from "@/types/source";
import { fetchTextSource, SourceDocumentError } from "@/lib/source-document";
import { getPdfHighlightRect, resolveTextHighlight } from "@/lib/source-locator";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type SourceSide = "si" | "bl";

type SourceViewerProps = {
  sources: Record<SourceSide, SourceDocument | null>;
  highlights: Record<SourceSide, SourceHighlight | null>;
  field: string;
  onClose: () => void;
};

const controls = "min-h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40";

function fieldLabel(value: string) {
  return value
    .toLocaleLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

function SourceDocumentPane({ side, source, highlight }: { side: SourceSide; source: SourceDocument | null; highlight: SourceHighlight | null }) {
  const title = side === "si" ? "Shipping Instruction" : "Draft Bill of Lading";
  const container = useRef<HTMLDivElement>(null);
  const highlightedText = useRef<HTMLElement>(null);
  const requestedPage = highlight?.locator?.kind === "pdf" ? highlight.locator.page : highlight?.page ?? 1;
  const [width, setWidth] = useState(300);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(requestedPage);
  const [total, setTotal] = useState<number | null>(null);
  const [originalPageWidth, setOriginalPageWidth] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(160, Math.min(800, entry.contentRect.width - 24))));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (source?.format !== "txt") return;
    const controller = new AbortController();
    setTextContent(null);
    setError("");
    fetchTextSource(source.url, fetch, { signal: controller.signal })
      .then(setTextContent)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof SourceDocumentError ? reason.message : "Source file could not be loaded.");
        }
      });
    return () => controller.abort();
  }, [source]);

  const textHighlight = useMemo(() => {
    if (source?.format !== "txt" || textContent === null) return null;
    const locator = highlight?.locator?.kind === "txt" ? highlight.locator : null;
    return resolveTextHighlight(textContent, locator, highlight?.evidenceText ?? null);
  }, [highlight, source?.format, textContent]);

  useEffect(() => {
    if (textHighlight) highlightedText.current?.scrollIntoView({ block: "center" });
  }, [textHighlight]);

  useEffect(() => {
    setPage(requestedPage);
    setTotal(null);
    setOriginalPageWidth(null);
    setNotice("");
    setError("");
  }, [requestedPage, source]);

  useEffect(() => setOriginalPageWidth(null), [page]);

  function loaded({ numPages }: { numPages: number }) {
    setTotal(numPages);
    if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > numPages) {
      setNotice(`Evidence page ${requestedPage} is unavailable in this ${numPages}-page document. Showing page 1.`);
      setPage(1);
    } else {
      setPage(requestedPage);
    }
  }

  const renderedPageWidth = width * zoom;
  const pdfLocator = highlight?.locator?.kind === "pdf" ? highlight.locator : null;
  const pdfRect = pdfLocator && pdfLocator.page === page && originalPageWidth !== null
    ? getPdfHighlightRect(pdfLocator, originalPageWidth, renderedPageWidth)
    : null;
  const exactHighlightUnavailable = source?.format === "txt"
    ? textContent !== null && textHighlight === null
    : source?.format === "pdf"
      ? total !== null && pdfRect === null
      : source?.format === "docx" || source?.format === "xlsx";

  return (
    <section aria-labelledby={`source-pane-${side}`} className="flex min-h-[34rem] min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm lg:min-h-0">
      <header className={`shrink-0 border-b border-slate-200 p-3.5 ${side === "si" ? "bg-blue-50/70" : "bg-slate-50"}`}>
        <div className="flex items-center gap-2"><span aria-hidden="true" className={`size-2 rounded-full ${side === "si" ? "bg-blue-700" : "bg-slate-600"}`} /><h3 id={`source-pane-${side}`} className="text-sm font-semibold">{title}</h3></div>
        <p className="mt-1 break-all text-xs text-slate-500">{source?.filename ?? "Source document unavailable"}</p>
        {source?.synthetic && <p className="mt-1 text-xs text-slate-500">Synthetic demo document, not an original shipment file.</p>}
      </header>

      {!source ? (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-6">
          <p className="text-sm text-slate-600">Source document unavailable.</p>
        </div>
      ) : (
        <>
          {source.format === "pdf" && (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-slate-200 p-2">
              <button type="button" className={controls} disabled={total === null || page <= 1 || !!error} onClick={() => setPage(page - 1)}>Previous</button>
              <p aria-live="polite" className="text-sm tabular-nums">Page {page} of {total ?? "..."}</p>
              <button type="button" className={controls} disabled={total === null || page >= total || !!error} onClick={() => setPage(page + 1)}>Next</button>
              <button type="button" className={controls} aria-label={`Zoom out ${title}`} disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - 0.5))}>-</button>
              <span className="text-xs">{Math.round(zoom * 100)}%</span>
              <button type="button" className={controls} aria-label={`Zoom in ${title}`} disabled={zoom >= 3} onClick={() => setZoom(Math.min(3, zoom + 0.5))}>+</button>
            </div>
          )}
          {notice && <p role="status" className="shrink-0 border-b border-slate-200 px-3 py-2 text-sm">{notice}</p>}
          <div className="shrink-0 border-b border-slate-200 bg-amber-50/60 px-3 py-2.5 text-xs leading-5 text-slate-700">
            <span className="font-semibold text-slate-900">Selected evidence:</span> {highlight?.evidenceText || "Evidence unavailable."}
            {highlight?.reference && <span className="ml-2 text-slate-500">Source: {highlight.reference}</span>}
            {exactHighlightUnavailable && <span className="ml-2 text-slate-500">Exact source highlighting is unavailable for this evidence.</span>}
          </div>
          <div ref={container} className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-4">
            {error ? (
              <p role="alert" className="p-3 text-sm text-red-800">{error}</p>
            ) : source.format === "pdf" ? (
              <Document suspense={false} onPassword={() => setError("This document is password-protected and cannot be displayed here.")} file={source.url} onLoadSuccess={loaded} onLoadError={() => setError("The document could not be loaded. The file may be unavailable or invalid.")} onSourceError={() => setError("The document source is unavailable.")} loading={<p role="status">Loading document...</p>} className="flex min-w-max justify-center">
                {total !== null && (
                  <div className="relative w-fit">
                    <Page suspense={false} pageNumber={page} width={renderedPageWidth} renderTextLayer={false} renderAnnotationLayer={false} onLoadSuccess={(loadedPage: PDFPageProxy) => setOriginalPageWidth(loadedPage.getViewport({ scale: 1 }).width)} onRenderError={() => setError("This document page could not be displayed.")} onLoadError={() => setError("This document page is unavailable.")} loading={<p role="status">Loading page...</p>} />
                    {pdfRect && <div role="note" aria-label={`Highlighted ${title} source evidence`} className="pointer-events-none absolute border-2 border-amber-600 bg-amber-300/35 outline outline-1 outline-white" style={{ left: pdfRect.left, top: pdfRect.top, width: pdfRect.width, height: pdfRect.height }} />}
                  </div>
                )}
              </Document>
            ) : source.format === "txt" ? (
              textContent === null ? (
                <p role="status" className="p-3 text-sm">Loading {title} text document...</p>
              ) : (
                <pre className="whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white p-4 font-mono text-[13px] leading-6 text-slate-800 shadow-sm">
                  {textHighlight ? <>{textContent.slice(0, textHighlight.start)}<mark ref={highlightedText} aria-label={`Highlighted ${title} source evidence on line ${textHighlight.lineNumber}`} className="rounded-sm bg-amber-200 px-0.5 text-slate-950 outline outline-1 outline-amber-600">{textContent.slice(textHighlight.start, textHighlight.end)}</mark>{textContent.slice(textHighlight.end)}</> : textContent}
                </pre>
              )
            ) : (
              <div className="rounded border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold">Preview unavailable for this format</h4>
                <p className="mt-2 text-sm text-slate-600">{source.format.toLocaleUpperCase()} files are provided by the backend as original attachments.</p>
                {highlight?.reference && <p className="mt-2 text-sm text-slate-700">Source: {highlight.reference}</p>}
                {highlight?.evidenceText && <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">{highlight.evidenceText}</blockquote>}
                <a href={source.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700">Open or download original</a>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default function SourceViewer({ sources, highlights, field, onClose }: SourceViewerProps) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-2 sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="source-comparison-title" className="h-[94dvh] max-h-[94dvh] w-[98vw] max-w-[100rem] overflow-hidden rounded-md border border-slate-300 bg-white text-slate-900 shadow-2xl sm:w-[96vw]">
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5">
            <div className="min-w-0">
              <h2 id="source-comparison-title" className="text-base font-bold">Source Comparison: {fieldLabel(field)}</h2>
              <p className="mt-1 text-xs text-slate-500">Shipping Instruction vs Draft Bill of Lading</p>
            </div>
            <button ref={closeButton} type="button" onClick={onClose} className={controls}>Close</button>
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-200/70 p-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 lg:overflow-hidden">
            <SourceDocumentPane side="si" source={sources.si} highlight={highlights.si} />
            <SourceDocumentPane side="bl" source={sources.bl} highlight={highlights.bl} />
          </div>
        </div>
      </section>
    </div>
  );
}
