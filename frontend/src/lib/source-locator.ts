import type { ExtractedField, SourceLocator } from "@/types/verification";

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

export const comparisonMethodLabels = {
  EXACT: "Exact comparison",
  NORMALIZED: "Normalized comparison",
  SEMANTIC_RULE: "Semantic rule",
  SEMANTIC_AI: "Semantic AI review",
} as const;
