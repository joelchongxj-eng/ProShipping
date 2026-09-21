"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFPageProxy } from "pdfjs-dist";
import type { SourceDocument, SourceHighlight } from "@/types/source";
import { fetchTextSource, SourceDocumentError } from "@/lib/source-document";
import { getPdfHighlightRect, resolveTextHighlight } from "@/lib/source-locator";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export default function SourceViewer({ source, title, highlight, onClose }: { source: SourceDocument; title: string; highlight: SourceHighlight | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
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
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(160, Math.min(850, entry.contentRect.width - 24))));
    if (container.current) observer.observe(container.current);
    return () => { observer.disconnect(); element?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);

  useEffect(() => {
    if (source.format !== "txt") return;
    const controller = new AbortController();
    setTextContent(null);
    setError("");
    fetchTextSource(source.url, (input, init) => fetch(input, { ...init, signal: controller.signal }))
        .then(setTextContent)
        .catch((reason: unknown) => {
          if (!(reason instanceof DOMException && reason.name === "AbortError")) {
            setError(reason instanceof SourceDocumentError ? reason.message : "Source file could not be loaded.");
          }
        });
    return () => controller.abort();
  }, [source]);

  const textHighlight = useMemo(() => {
    if (source.format !== "txt" || textContent === null) return null;
    const locator = highlight?.locator?.kind === "txt" ? highlight.locator : null;
    return resolveTextHighlight(textContent, locator, highlight?.evidenceText ?? null);
  }, [highlight, source.format, textContent]);

  useEffect(() => {
    if (textHighlight) highlightedText.current?.scrollIntoView({ block: "center" });
  }, [textHighlight]);

  useEffect(() => setOriginalPageWidth(null), [page]);

  function loaded({ numPages }: { numPages: number }) {
    setTotal(numPages);
    const requested = requestedPage;
    if (!Number.isInteger(requested) || requested < 1 || requested > numPages) {
      setNotice(`Evidence page ${requested} is unavailable in this ${numPages}-page document. Showing page 1.`);
      setPage(1);
    } else setPage(requested);
  }

  const renderedPageWidth = width * zoom;
  const pdfLocator = highlight?.locator?.kind === "pdf" ? highlight.locator : null;
  const pdfRect = pdfLocator && pdfLocator.page === page && originalPageWidth !== null
    ? getPdfHighlightRect(pdfLocator, originalPageWidth, renderedPageWidth)
    : null;
  const exactHighlightUnavailable = source.format === "txt"
    ? textContent !== null && textHighlight === null
    : source.format === "pdf"
      ? total !== null && pdfRect === null
      : source.format === "docx" || source.format === "xlsx";

  const controls = "min-h-10 rounded border border-slate-300 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="source-title" className="fixed inset-0 m-auto h-[92dvh] max-h-[92dvh] w-[96vw] max-w-5xl overflow-hidden rounded-md border border-slate-300 bg-white p-0 text-slate-900 backdrop:bg-black/40">
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 p-3">
          <div className="min-w-0"><h2 id="source-title" className="text-base font-semibold">{title}</h2><p className="mt-1 break-all text-xs text-slate-500">{source.filename}</p>{source.synthetic && <p className="mt-1 text-xs text-slate-500">Synthetic demo document, not an original shipment file.</p>}</div>
          <button type="button" onClick={onClose} className={controls}>Close</button>
        </header>
        {source.format === "pdf" && <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-b border-slate-200 p-2">
          <button type="button" className={controls} disabled={total === null || page <= 1 || !!error} onClick={() => setPage(page - 1)}>Previous</button>
          <p aria-live="polite" className="text-sm tabular-nums">Page {page} of {total ?? "..."}</p>
          <button type="button" className={controls} disabled={total === null || page >= total || !!error} onClick={() => setPage(page + 1)}>Next</button>
          <button type="button" className={controls} aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - 0.5))}>-</button>
          <span className="text-xs">{Math.round(zoom * 100)}%</span>
          <button type="button" className={controls} aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(Math.min(3, zoom + 0.5))}>+</button>
        </div>}
        {notice && <p role="status" className="shrink-0 border-b border-slate-200 px-3 py-2 text-sm">{notice}</p>}
        <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700">
          <span className="font-semibold">Selected evidence:</span> {highlight?.evidenceText || "Evidence unavailable."}
          {highlight?.reference && <span className="ml-2 text-slate-500">Source: {highlight.reference}</span>}
          {exactHighlightUnavailable && <span className="ml-2 text-slate-500">Exact source highlighting is unavailable for this evidence.</span>}
        </div>
        <div ref={container} className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
          {error ? <p role="alert" className="p-3 text-sm text-red-800">{error}</p> : source.format === "pdf" ? (
            <Document suspense={false} onPassword={() => setError("This document is password-protected and cannot be displayed here.")} file={source.url} onLoadSuccess={loaded} onLoadError={() => setError("The document could not be loaded. The file may be unavailable or invalid.")} onSourceError={() => setError("The document source is unavailable.")} loading={<p role="status">Loading document...</p>} className="flex min-w-max justify-center">
              {total !== null && <div className="relative w-fit">
                <Page suspense={false} pageNumber={page} width={renderedPageWidth} renderTextLayer={false} renderAnnotationLayer={false} onLoadSuccess={(loadedPage: PDFPageProxy) => setOriginalPageWidth(loadedPage.getViewport({ scale: 1 }).width)} onRenderError={() => setError("This document page could not be displayed.")} onLoadError={() => setError("This document page is unavailable.")} loading={<p role="status">Loading page...</p>} />
                {pdfRect && <div role="note" aria-label="Highlighted source evidence" className="pointer-events-none absolute border-2 border-amber-600 bg-amber-300/35 outline outline-1 outline-white" style={{ left: pdfRect.left, top: pdfRect.top, width: pdfRect.width, height: pdfRect.height }} />}
              </div>}
            </Document>
          ) : source.format === "txt" ? (
            textContent === null ? <p role="status" className="p-3 text-sm">Loading text document...</p> : <pre className="whitespace-pre-wrap break-words rounded border border-slate-200 bg-white p-4 font-mono text-sm leading-6 text-slate-800">{textHighlight ? <>{textContent.slice(0, textHighlight.start)}<mark ref={highlightedText} aria-label={`Highlighted source evidence on line ${textHighlight.lineNumber}`} className="rounded-sm bg-amber-200 px-0.5 text-slate-950 outline outline-1 outline-amber-600">{textContent.slice(textHighlight.start, textHighlight.end)}</mark>{textContent.slice(textHighlight.end)}</> : textContent}</pre>
          ) : (
            <div className="rounded border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold">Preview unavailable for this format</h3>
              <p className="mt-2 text-sm text-slate-600">{source.format.toLocaleUpperCase()} files are provided by the backend as original attachments.</p>
              {highlight?.reference && <p className="mt-2 text-sm text-slate-700">Source: {highlight.reference}</p>}
              {highlight?.evidenceText && <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">{highlight.evidenceText}</blockquote>}
              <a href={source.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700">Open or download original</a>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
