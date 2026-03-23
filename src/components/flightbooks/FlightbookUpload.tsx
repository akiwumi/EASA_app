"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

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
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [targetMode, setTargetMode] = useState<"new" | "existing">("new");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("OM-A");
  const [versionLabel, setVersionLabel] = useState("");

  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickFile = (f: File) => {
    setFile(f);
    setResults(null);
    setError(null);
    if (!docName) setDocName(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

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
    }
    setUploading(false);
  }

  const acceptedTypes = ".pdf,.txt,.md,.json";
  const totalSections = results?.reduce((s, r) => s + r.sectionsImported, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Upload flight book</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Import a PDF, plain text, or JSON fixture. The AI will use the extracted sections to map against EASA regulation changes.
        </p>
      </div>

      {/* Success */}
      {results && (
        <div className="easa-card border-[var(--easa-color-accent-green)] p-4">
          <div className="flex items-center gap-2 text-[var(--easa-color-accent-green)]">
            <CheckCircle size={18} strokeWidth={1.75} />
            <span className="font-semibold text-sm">Import complete — {totalSections} sections saved</span>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-[var(--easa-color-text-muted)]">
            {results.map((r, i) => (
              <li key={i}>"{r.bookName}" — {r.sectionsImported} section{r.sectionsImported !== 1 ? "s" : ""}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="easa-card border-[var(--easa-color-accent-pink)] p-4">
          <div className="flex items-center gap-2 text-[var(--easa-color-accent-pink)]">
            <AlertCircle size={18} strokeWidth={1.75} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`rounded-[var(--easa-radius-md)] border-2 border-dashed p-10 text-center transition cursor-pointer ${
          dragging
            ? "border-[var(--easa-color-brand-primary)] bg-[color-mix(in_srgb,var(--easa-color-brand-primary)_8%,transparent)]"
            : "border-[var(--easa-color-border)] hover:border-[var(--easa-color-brand-primary)] hover:bg-[var(--easa-color-surface-2)]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept={acceptedTypes} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileText size={32} strokeWidth={1.5} className="text-[var(--easa-color-brand-primary)]" />
            <p className="font-medium text-sm">{file.name}</p>
            <p className="text-xs text-[var(--easa-color-text-muted)]">{(file.size / 1024).toFixed(0)} KB · click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--easa-color-text-muted)]">
            <Upload size={32} strokeWidth={1.5} />
            <p className="font-medium text-sm">Drop a file here or click to browse</p>
            <p className="text-xs">PDF · TXT · MD · JSON (sample-import format)</p>
          </div>
        )}
      </div>

      {file && (
        <div className="easa-card space-y-4 p-5">
          {/* Target: new or existing book */}
          {existingBooks.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Save to</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={targetMode === "new"} onChange={() => setTargetMode("new")} />
                  New flight book
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={targetMode === "existing"} onChange={() => setTargetMode("existing")} />
                  Replace sections in existing book
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
                <input className="easa-input w-full" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Operations Manual Part A" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Doc type</label>
                  <select className="easa-input w-full" value={docType} onChange={(e) => setDocType(e.target.value)}>
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Version (optional)</label>
                  <input className="easa-input w-full" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="e.g. Rev 2.1" />
                </div>
              </div>
            </>
          )}

          <button
            className="easa-btn primary w-full justify-center"
            disabled={uploading || (targetMode === "existing" && !selectedBookId)}
            onClick={upload}
          >
            {uploading ? "Processing…" : "Import flight book"}
          </button>
        </div>
      )}

      <div className="easa-card p-4 text-xs text-[var(--easa-color-text-muted)] space-y-1">
        <p><strong className="text-[var(--easa-color-text-secondary)]">PDF</strong> — text is extracted and split into sections automatically using numbered headings (e.g. 1.2.3)</p>
        <p><strong className="text-[var(--easa-color-text-secondary)]">TXT / MD</strong> — same section detection applied to plain text</p>
        <p><strong className="text-[var(--easa-color-text-secondary)]">JSON</strong> — use the <code>sample-import.json</code> format in <code>data/fixtures/flightbooks/</code></p>
      </div>
    </div>
  );
}
