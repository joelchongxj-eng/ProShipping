"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { ApiError, compareUploadedDocuments } from "@/lib/api";
import {
  buildUploadResultHref,
  formatFileSize,
  getFileExtension,
  supportedUploadExtensions,
  validateUploadSelection,
  type UploadRole,
} from "@/lib/upload";

interface FilePickerProps {
  role: UploadRole;
  file: File | null;
  error?: string;
  disabled: boolean;
  onChange: (file: File | null) => void;
}

function FilePicker({ role, file, error, disabled, onChange }: FilePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const label = role === "si" ? "Shipping Instruction" : "Draft Bill of Lading";

  function choose(nextFile: File | null) {
    if (!disabled) onChange(nextFile);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    choose(event.dataTransfer.files.item(0));
  }

  return (
    <section aria-labelledby={`${role}-upload-title`} className={`rounded-md border bg-white p-4 shadow-sm ${role === "si" ? "border-blue-200" : "border-slate-300"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`${role}-upload-title`} className="text-sm font-semibold text-slate-950">{label}</h2>
          <p className="mt-1 text-xs text-slate-500">{role === "si" ? "Reference document" : "Document to verify against the SI"}</p>
        </div>
        <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${role === "si" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-300 bg-slate-50 text-slate-700"}`}>{role.toLocaleUpperCase()}</span>
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
        className={`mt-4 min-h-36 rounded-md border border-dashed p-4 ${error ? "border-red-400 bg-red-50/40" : file ? "border-blue-300 bg-blue-50/40" : "border-slate-300 bg-slate-50/70"}`}
      >
        {file ? (
          <div className="space-y-3">
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-slate-900">{file.name}</p>
              <p className="mt-1 text-xs text-slate-500">{getFileExtension(file.name)} · {formatFileSize(file.size)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="min-h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Replace file</button>
              <button type="button" disabled={disabled} onClick={() => choose(null)} className="min-h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50">Remove file</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-700">Drag and drop the {label}, or browse from your device.</p>
            <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="mt-3 min-h-9 rounded-md border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-950 shadow-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Browse files</button>
          </div>
        )}
        <input
          ref={input}
          type="file"
          className="sr-only"
          accept={supportedUploadExtensions.join(",")}
          disabled={disabled}
          aria-label={`Choose ${label} file`}
          onChange={(event) => {
            choose(event.target.files?.item(0) ?? null);
            event.target.value = "";
          }}
        />
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : <p className="mt-2 text-xs text-slate-500">PDF, TXT, DOCX, or XLSX · Maximum 10 MB</p>}
    </section>
  );
}

export function UploadForm() {
  const router = useRouter();
  const [siFile, setSiFile] = useState<File | null>(null);
  const [blFile, setBlFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const validation = validateUploadSelection(siFile, blFile);
  const canSubmit = Boolean(siFile && blFile && !validation.si && !validation.bl && !submitting);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !siFile || !blFile) return;
    setSubmitting(true);
    setRequestError("");
    try {
      const result = await compareUploadedDocuments(siFile, blFile);
      router.push(buildUploadResultHref(result.comparison_id));
    } catch (error) {
      setRequestError(error instanceof ApiError ? error.message : "The documents could not be verified. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <FilePicker role="si" file={siFile} error={validation.si} disabled={submitting} onChange={(file) => { setSiFile(file); setRequestError(""); }} />
        <FilePicker role="bl" file={blFile} error={validation.bl} disabled={submitting} onChange={(file) => { setBlFile(file); setRequestError(""); }} />
      </div>

      {requestError && (
        <div role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900">
          <p className="font-medium">Upload verification failed</p>
          <p className="mt-1">{requestError}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button type="submit" disabled={!canSubmit} className="min-h-11 rounded-md bg-blue-950 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? "Processing documents..." : "Verify Documents"}
        </button>
        <p role="status" aria-live="polite" className="text-xs text-slate-500">
          {submitting ? "Extracting and comparing SI and Draft BL..." : "The backend performs extraction, normalization, and comparison."}
        </p>
      </div>
    </form>
  );
}
