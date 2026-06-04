"use client";

import { useRef, useState, useCallback } from "react";
import { FileText, CheckCircle, AlertCircle, Upload, X, ChevronDown, ChevronUp } from "lucide-react";

const DOC_TYPES = ["OM-A", "OM-B", "OM-C", "OM-D", "MEL", "MMEL", "MCC", "AOM", "FCL", "Other"];
const SUPPORTED_FILE_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".md", ".json"];

interface ExistingBook { id: string; name: string; doc_type: string }
interface Props { existingBooks: ExistingBook[] }

type FileStatus = "pending" | "uploading" | "done" | "error";

interface QueuedFile {
  id: string;
  file: File;
  docName: string;
  docType: string;
  status: FileStatus;
  sectionsImported?: number;
  error?: string;
}

function isSupportedFile(file: File) {
  const lower = file.name.toLowerCase();
  return SUPPORTED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function fileId() {
  return Math.random().toString(36).slice(2);
}

function guessName(file: File) {
  return file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

export default function FlightbookUpload({ existingBooks }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Shared metadata applied to all files in the queue
  const [versionLabel, setVersionLabel] = useState("");
  const [aircraft, setAircraft] = useState("");
  const [manualGroup, setManualGroup] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [tags, setTags] = useState("");
  const [importNotes, setImportNotes] = useState("");

  // "Replace existing" mode (only applies when queue has exactly 1 file)
  const [targetMode, setTargetMode] = useState<"new" | "existing">("new");
  const [selectedBookId, setSelectedBookId] = useState("");

  const addFiles = useCallback((incoming: File[]) => {
    const valid: QueuedFile[] = [];
    const bad: string[] = [];
    for (const f of incoming) {
      if (!isSupportedFile(f)) { bad.push(f.name); continue; }
      valid.push({ id: fileId(), file: f, docName: guessName(f), docType: "OM-A", status: "pending" });
    }
    if (bad.length) setGlobalError(`Unsupported file${bad.length > 1 ? "s" : ""}: ${bad.join(", ")}`);
    else setGlobalError(null);
    if (valid.length) setQueue((prev) => [...prev, ...valid]);
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addFiles(files);
    e.target.value = "";
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragActive(true); }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragActive(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function removeFile(id: string) {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  }

  function updateFile(id: string, patch: Partial<Pick<QueuedFile, "docName" | "docType">>) {
    setQueue((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }

  async function uploadOne(item: QueuedFile): Promise<{ sectionsImported: number } | { error: string }> {
    const form = new FormData();
    form.append("file", item.file);
    if (targetMode === "existing" && selectedBookId && queue.length === 1) {
      form.append("flightbookId", selectedBookId);
    } else {
      form.append("docName", item.docName || item.file.name);
      form.append("docType", item.docType);
      if (versionLabel) form.append("versionLabel", versionLabel);
      if (aircraft) form.append("aircraft", aircraft);
      if (manualGroup) form.append("manualGroup", manualGroup);
      if (effectiveDate) form.append("effectiveDate", effectiveDate);
      if (tags) form.append("tags", tags);
      if (importNotes) form.append("importNotes", importNotes);
    }
    const res = await fetch("/api/flightbooks/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? "Upload failed" };
    const sections = json.results?.[0]?.sectionsImported ?? json.sectionsImported ?? 0;
    return { sectionsImported: sections };
  }

  async function uploadAll() {
    const pending = queue.filter((f) => f.status === "pending");
    if (!pending.length) return;
    setUploading(true);
    setGlobalError(null);

    for (const item of pending) {
      setQueue((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading" } : f));
      const result = await uploadOne(item);
      if ("error" in result) {
        setQueue((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error: result.error } : f));
      } else {
        setQueue((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "done", sectionsImported: result.sectionsImported } : f));
      }
    }
    setUploading(false);
  }

  function clearDone() {
    setQueue((prev) => prev.filter((f) => f.status !== "done"));
  }

  const pending = queue.filter((f) => f.status === "pending");
  const done = queue.filter((f) => f.status === "done");
  const hasErrors = queue.some((f) => f.status === "error");
  const totalSections = done.reduce((s, f) => s + (f.sectionsImported ?? 0), 0);

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold">Upload flight books</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Drop one or more files — PDF, DOC, DOCX, TXT, MD, or JSON. Each book is parsed into sections and indexed for AI regulation comparison.
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose or drop flight book files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-[20px] border-2 border-dashed p-8 text-center transition cursor-pointer ${
          dragActive
            ? "border-[var(--easa-color-brand-primary)] bg-[color-mix(in_srgb,var(--easa-color-brand-primary)_6%,transparent)]"
            : "border-[var(--easa-color-border)] bg-white hover:border-[var(--easa-color-brand-primary)] hover:bg-[var(--easa-color-surface-2)]"
        }`}
      >
        <Upload className="mx-auto text-[var(--easa-color-brand-primary)]" size={28} strokeWidth={1.5} />
        <p className="mt-3 text-sm font-semibold text-[var(--easa-color-text-primary)]">
          {dragActive ? "Drop to add files" : "Drag and drop flight books here"}
        </p>
        <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
          or click to browse — you can select multiple files at once
        </p>
        <p className="mt-2 text-[10px] text-[var(--easa-color-text-muted)] uppercase tracking-wide">
          PDF · DOC · DOCX · TXT · MD · JSON
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_FILE_EXTENSIONS.join(",")}
        multiple
        className="sr-only"
        onChange={onFileChange}
      />

      {globalError && (
        <div className="easa-card p-3 flex items-center gap-2 text-[var(--easa-color-accent-pink)]">
          <AlertCircle size={15} strokeWidth={1.75} />
          <span className="text-sm">{globalError}</span>
        </div>
      )}

      {/* File queue */}
      {queue.length > 0 && (
        <div className="easa-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {queue.length} file{queue.length !== 1 ? "s" : ""} queued
            </p>
            {done.length > 0 && (
              <button onClick={clearDone} className="text-xs text-[var(--easa-color-text-muted)] underline underline-offset-2 hover:text-[var(--easa-color-text-secondary)]">
                Clear completed
              </button>
            )}
          </div>

          <ul className="space-y-2">
            {queue.map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--easa-color-border)] p-3">
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className="mt-0.5 shrink-0">
                    {item.status === "done" && <CheckCircle size={16} strokeWidth={1.75} className="text-[var(--easa-color-accent-green)]" />}
                    {item.status === "error" && <AlertCircle size={16} strokeWidth={1.75} className="text-[var(--easa-color-accent-pink)]" />}
                    {item.status === "uploading" && (
                      <span className="inline-block h-4 w-4 rounded-full border-2 border-[var(--easa-color-brand-primary)] border-t-transparent animate-spin" />
                    )}
                    {item.status === "pending" && <FileText size={16} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />}
                  </div>

                  {/* File info + editable fields */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs text-[var(--easa-color-text-muted)] truncate">{item.file.name} · {(item.file.size / 1024).toFixed(0)} KB</p>

                    {item.status === "pending" || item.status === "uploading" ? (
                      <div className="flex gap-2">
                        <input
                          className="easa-input flex-1 text-sm"
                          value={item.docName}
                          onChange={(e) => updateFile(item.id, { docName: e.target.value })}
                          placeholder="Document name"
                          disabled={item.status === "uploading"}
                        />
                        <select
                          className="easa-input w-28 text-sm"
                          value={item.docType}
                          onChange={(e) => updateFile(item.id, { docType: e.target.value })}
                          disabled={item.status === "uploading"}
                        >
                          {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ) : item.status === "done" ? (
                      <p className="text-xs font-medium text-[var(--easa-color-accent-green)]">
                        {item.sectionsImported} section{item.sectionsImported !== 1 ? "s" : ""} imported — {item.docName}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--easa-color-accent-pink)]">{item.error}</p>
                    )}
                  </div>

                  {/* Remove button */}
                  {item.status === "pending" && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="shrink-0 rounded p-1 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-accent-pink)] transition"
                      aria-label="Remove file"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {done.length > 0 && totalSections > 0 && (
            <p className="text-xs text-[var(--easa-color-text-muted)]">
              {totalSections} total sections saved across {done.length} book{done.length !== 1 ? "s" : ""}.
            </p>
          )}
        </div>
      )}

      {/* Replace existing (single file only) */}
      {queue.length === 1 && existingBooks.length > 0 && queue[0]?.status === "pending" && (
        <div className="easa-card p-4 space-y-3">
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="target" checked={targetMode === "new"} onChange={() => setTargetMode("new")} />
              New flight book
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="target" checked={targetMode === "existing"} onChange={() => setTargetMode("existing")} />
              Replace existing
            </label>
          </div>
          {targetMode === "existing" && (
            <select className="easa-input w-full" value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)}>
              <option value="">— choose book to replace —</option>
              {existingBooks.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.doc_type})</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Shared advanced metadata */}
      {pending.length > 0 && targetMode === "new" && (
        <div className="easa-card p-4 space-y-3">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-[var(--easa-color-text-secondary)]"
          >
            <span>Optional metadata {pending.length > 1 ? "(applied to all files)" : ""}</span>
            {advancedOpen ? <ChevronUp size={15} strokeWidth={1.75} /> : <ChevronDown size={15} strokeWidth={1.75} />}
          </button>

          {advancedOpen && (
            <div className="space-y-3 pt-1">
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-muted)]">Version</label>
                  <input className="easa-input w-full" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="e.g. Rev 2.1" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-muted)]">Aircraft / fleet</label>
                  <input className="easa-input w-full" value={aircraft} onChange={(e) => setAircraft(e.target.value)} placeholder="e.g. C172 / PA-44" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-muted)]">Manual group</label>
                  <input className="easa-input w-full" value={manualGroup} onChange={(e) => setManualGroup(e.target.value)} placeholder="e.g. Student ops" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-muted)]">Effective date</label>
                  <input className="easa-input w-full" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-muted)]">Tags</label>
                <input className="easa-input w-full" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sop, briefing, piston" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-muted)]">Import notes</label>
                <textarea
                  className="easa-input min-h-20 w-full resize-y"
                  value={importNotes}
                  onChange={(e) => setImportNotes(e.target.value)}
                  placeholder="Revision summary, reviewer notes, or context for instructors"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload button */}
      {pending.length > 0 && (
        <button
          className="easa-btn primary flex w-full items-center justify-center gap-2"
          disabled={uploading || (targetMode === "existing" && !selectedBookId && queue.length === 1)}
          onClick={uploadAll}
        >
          <Upload size={15} strokeWidth={1.75} />
          {uploading
            ? "Uploading…"
            : pending.length === 1
            ? "Import flight book"
            : `Import ${pending.length} flight books`}
        </button>
      )}

      {hasErrors && !uploading && pending.length > 0 && (
        <p className="text-xs text-[var(--easa-color-text-muted)] text-center">
          Some files failed — fix the errors above and try again, or remove them from the queue.
        </p>
      )}

      <div className="easa-card p-4 text-xs text-[var(--easa-color-text-muted)] space-y-1">
        <p><strong className="text-[var(--easa-color-text-secondary)]">PDF</strong>: text extracted and stored by detected sections or full-document chunks</p>
        <p><strong className="text-[var(--easa-color-text-secondary)]">DOC / DOCX</strong>: Word text extracted and stored by sections or full-document chunks</p>
        <p><strong className="text-[var(--easa-color-text-secondary)]">TXT / MD</strong>: plain text or Markdown stored by headings or full-document chunks</p>
        <p>
          <strong className="text-[var(--easa-color-text-secondary)]">JSON</strong>
          {": "}use the{" "}
          <a className="text-[var(--easa-color-accent-blue)] underline" href="/fixtures/flightbooks/sample-import.json" target="_blank" rel="noopener noreferrer">
            sample-import.json
          </a>
          {" "}fixture format
        </p>
      </div>
    </div>
  );
}
