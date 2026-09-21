import type { UploadedFileReference } from "./upload";
import type { SourceLocator } from "./verification";

export type SourceDocumentFormat = "pdf" | "txt" | "docx" | "xlsx";

export interface SourceDocument {
  url: string;
  filename: string;
  format: SourceDocumentFormat;
  synthetic?: boolean;
}

export interface SourceHighlight {
  evidenceText: string | null;
  locator: SourceLocator | null;
  page: number | null;
  reference: string | null;
}

export type EvidenceSourceContext =
  | { kind: "case"; emailId: string; mockMode: boolean; siAttachment: string | null; blAttachment: string | null }
  | { kind: "upload"; comparisonId: string; siFile: UploadedFileReference; blFile: UploadedFileReference };
