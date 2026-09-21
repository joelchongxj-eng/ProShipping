import type { ExtractedField, SourceLocator } from "@/types/verification";

export interface TextHighlightRange {
  start: number;
  end: number;
  lineNumber: number;
}

export interface PdfHighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function formatDocxLocator(locator: Extract<SourceLocator, { kind: "docx" }>): string {
  const parts: string[] = [];
  if (locator.paragraph_index != null) parts.push(`paragraph ${locator.paragraph_index + 1}`);
  if (locator.table_index != null) parts.push(`table ${locator.table_index + 1}`);
  if (locator.row_index != null) parts.push(`row ${locator.row_index + 1}`);
  if (locator.cell_index != null) parts.push(`cell ${locator.cell_index + 1}`);
  return parts.length > 0 ? `DOCX ${parts.join(", ")}` : "DOCX location available";
}

export function formatSourceLocator(value: ExtractedField | null): string | null {
  const source = value?.source;
  const locator = source?.locator;
  if (locator?.kind === "txt") return `TXT line ${locator.line_number}`;
  if (locator?.kind === "pdf") return `PDF page ${locator.page}`;
  if (locator?.kind === "xlsx") return `XLSX ${locator.sheet_name}!${locator.cell_address}`;
  if (locator?.kind === "docx") return formatDocxLocator(locator);
  const page = source?.page ?? value?.page;
  return page != null ? `Page ${page}` : source?.filename ? source.filename : null;
}

export function resolveTextHighlight(
  text: string,
  locator: Extract<SourceLocator, { kind: "txt" }> | null,
  evidenceText: string | null,
): TextHighlightRange | null {
  if (locator) {
    let lineStart = 0;
    let currentLine = 1;
    const lineBreaks = /\r\n|\n|\r/g;
    while (currentLine < locator.line_number) {
      const lineBreak = lineBreaks.exec(text);
      if (!lineBreak) break;
      lineStart = lineBreak.index + lineBreak[0].length;
      currentLine += 1;
    }
    const nextBreak = currentLine === locator.line_number ? lineBreaks.exec(text) : null;
    const lineEnd = nextBreak?.index ?? text.length;
    const lineLength = lineEnd - lineStart;
    if (currentLine === locator.line_number && locator.start_char < locator.end_char && locator.end_char <= lineLength) {
      return {
        start: lineStart + locator.start_char,
        end: lineStart + locator.end_char,
        lineNumber: locator.line_number,
      };
    }
  }

  const evidence = evidenceText?.trim();
  if (!evidence) return null;
  const start = text.indexOf(evidence);
  if (start < 0 || start !== text.lastIndexOf(evidence)) return null;
  return {
    start,
    end: start + evidence.length,
    lineNumber: text.slice(0, start).split(/\r\n|\n|\r/).length,
  };
}

export function getPdfHighlightRect(
  locator: Extract<SourceLocator, { kind: "pdf" }>,
  originalPageWidth: number,
  renderedPageWidth: number,
): PdfHighlightRect | null {
  if (originalPageWidth <= 0 || renderedPageWidth <= 0) return null;
  const { x0, y0, x1, y1 } = locator.bbox;
  if (![x0, y0, x1, y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) return null;
  const scale = renderedPageWidth / originalPageWidth;
  return {
    left: x0 * scale,
    top: y0 * scale,
    width: (x1 - x0) * scale,
    height: (y1 - y0) * scale,
  };
}

export const comparisonMethodLabels = {
  EXACT: "Exact comparison",
  NORMALIZED: "Normalized comparison",
  SEMANTIC_RULE: "Semantic rule",
  SEMANTIC_AI: "Semantic AI review",
} as const;
