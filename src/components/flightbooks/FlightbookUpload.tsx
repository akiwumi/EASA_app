"use client";

import { useRef, useState } from "react";
import { FileText, CheckCircle, AlertCircle, Upload } from "lucide-react";

const DOC_TYPES = ["OM-A", "OM-B", "OM-C", "OM-D", "MEL", "MMEL", "MCC", "AOM", "FCL", "Other"];

interface ExistingBook { id: string; name: string; doc_type: string }

interface Props {
  existingBooks: ExistingBook[];
}

interface UploadResult {
  bookName: string;
  sectionsImported: number;
}

export default function FlightbookUpload({ existingBooks }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const [targetMode, setTargetMode] = useState<"new" | "existing">("new");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("OM-A");
  const [versionLabel, setVersionLabel] = useState("");

  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResults(null);
    setError(null);
    if (f && !docName) setDocName(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResults(null);

    const form = new FormData();
    form.append("file", file);
    if (targetMode === "existing" && selectedBookId) {
      form.append("flightbookId", selectedBookId);
    } else {
      form.append("docName", docName || file.name);
      form.append("docType", docType);
      if (versionLabel) form.append("versionLabel", versionLabel);
    }

    const res = await fetch("/api/flightbooks/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Upload failed");
    } else {
      setResults(json.results);
      setFile(null);
      setDocName("");
      setVersionLabel("");
      if (inputRef.current) inputRef.current.value = "";
    }
    setUploading(false);
  }

  const totalSections = results?.reduce((s, r) => s + r.sectionsImported, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold">Upload flight book</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Import a PDF, plain text, or JSON fixture. Sections are extracted automatically and indexed for AI regulation comparison.
        </p>
      </div>

      {results && (
        <div className="easa-card p-4">
          <div className="flex items-center gap-2 text-[var(--easa-color-accent-green)]">
            <CheckCircle size={16} strokeWidth={1.75} />
            <span className="font-semibold text-sm">Import complete — {totalSections} sections saved</span>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-[var(--easa-color-text-muted)]">
            {results.map((r, i) => (
              <li key={i}>&quot;{r.bookName}&quot; — {r.sectionsImported} section{r.sectionsImported !== 1 ? "s" : ""}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="easa-card p-4">
          <div className="flex items-center gap-2 text-[var(--easa-color-accent-pink)]">
            <AlertCircle size={16} strokeWidth={1.75} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="easa-card space-y-4 p-5">
        {/* File picker */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">File</label>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,.json"
            className="easa-input w-full cursor-pointer"
            onChange={onFileChange}
          />
          {file && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--easa-color-text-muted)]">
              <FileText size={12} strokeWidth={1.75} />
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">PDF · TXT · MD · JSON</p>
        </div>

        {/* Target book */}
        {existingBooks.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Save to</label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="target" checked={targetMode === "new"} onChange={() => setTargetMode("new")} />
                New flight book
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="target" checked={targetMode === "existing"} onChange={() => setTargetMode("existing")} />
                Replace existing book
              </label>
            </div>
          </div>
        )}

        {targetMode === "existing" && existingBooks.length > 0 ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Select book</label>
            <select className="easa-input w-full" value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)}>
              <option value="">— choose —</option>
              {existingBooks.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.doc_type})</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">Existing sections will be replaced.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Document name</label>
              <input
                className="easa-input w-full"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Operations Manual Part A"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Type</label>
                <select className="easa-input w-full" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Version</label>
                <input
                  className="easa-input w-full"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="e.g. Rev 2.1"
                />
              </div>
            </div>
          </>
        )}

        <button
          className="easa-btn primary flex w-full items-center justify-center gap-2"
          disabled={uploading || !file || (targetMode === "existing" && !selectedBookId)}
          onClick={upload}
        >
          <Upload size={15} strokeWidth={1.75} />
          {uploading ? "Processing…" : "Import flight book"}
        </button>
      </div>

      <div className="easa-card p-4 text-xs text-[var(--easa-color-text-muted)] space-y-1">
        <p><strong className="text-[var(--easa-color-text-secondary)]">PDF</strong> — text extracted and split by numbered headings (1.2.3 pattern)</p>
        <p><strong className="text-[var(--easa-color-text-secondary)]">TXT / MD</strong> — same section detection on plain text</p>
        <p><strong className="text-[var(--easa-color-text-secondary)]">JSON</strong> — use the <code>sample-import.json</code> format from <code>data/fixtures/flightbooks/</code></p>
      </div>
    </div>
  );
}
