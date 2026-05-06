"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Plus,
  Trash2,
  X,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

type FieldType = "text" | "textarea" | "checkbox" | "select" | "date" | "number";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
}

interface SchemaJson {
  fields: FormField[];
}

interface TrainingForm {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  programmeId: string | null;
  programmeName: string | null;
  submissionCount: number;
}

interface Submission {
  id: string;
  submitted_by: string | null;
  student_user_id: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  payload: Record<string, unknown>;
  submittedByName: string | null;
  studentName: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox (yes/no)" },
  { value: "select", label: "Dropdown (select one)" },
];

// ── Field builder row ────────────────────────────────────────────────────────

function FieldRow({
  field,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: FormField;
  onChange: (updated: FormField) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  function set<K extends keyof FormField>(key: K, value: FormField[K]) {
    onChange({ ...field, [key]: value });
  }

  return (
    <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="disabled:opacity-30 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="disabled:opacity-30 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <input
          className="easa-input flex-1 text-sm"
          placeholder="Field label"
          value={field.label}
          onChange={(e) => set("label", e.target.value)}
        />
        <select
          className="easa-input text-sm"
          value={field.type}
          onChange={(e) => set("type", e.target.value as FieldType)}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[var(--easa-color-text-muted)] whitespace-nowrap">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => set("required", e.target.checked)}
          />
          Required
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="text-[var(--easa-color-accent-pink)] hover:opacity-70"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {field.type === "select" && (
        <div className="pl-6 space-y-1.5">
          <p className="text-xs text-[var(--easa-color-text-muted)]">
            Options (one per line)
          </p>
          <textarea
            className="easa-input w-full text-sm min-h-20"
            placeholder={"Option A\nOption B\nOption C"}
            value={(field.options ?? []).join("\n")}
            onChange={(e) =>
              set(
                "options",
                e.target.value
                  .split("\n")
                  .map((o) => o.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
      )}
    </div>
  );
}

// ── Create form modal ────────────────────────────────────────────────────────

function CreateFormModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: uid(), type: "text", label: "", required: false },
    ]);
  }

  function updateField(index: number, updated: FormField) {
    setFields((prev) => prev.map((f, i) => (i === index ? updated : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleCreate() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/training/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        schemaJson: { fields },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create form");
      setSaving(false);
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="easa-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Create training form</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              Form title <span className="text-[var(--easa-color-accent-pink)]">*</span>
            </span>
            <input
              className="easa-input w-full"
              placeholder="e.g. Pre-solo check, Ground exam, Safety briefing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              Description (optional)
            </span>
            <textarea
              className="easa-input w-full min-h-16"
              placeholder="Brief description of this form's purpose"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Fields</h3>
            <button
              type="button"
              onClick={addField}
              className="easa-btn secondary flex items-center gap-1.5 text-xs"
            >
              <Plus size={13} /> Add field
            </button>
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              No fields yet. Add at least one field for students to fill out.
            </p>
          ) : (
            <div className="space-y-2">
              {fields.map((field, i) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  onChange={(updated) => updateField(i, updated)}
                  onRemove={() => removeField(i)}
                  onMoveUp={() => moveField(i, -1)}
                  onMoveDown={() => moveField(i, 1)}
                  isFirst={i === 0}
                  isLast={i === fields.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-[var(--easa-color-accent-pink)]">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="easa-btn primary"
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? "Creating…" : "Create form"}
          </button>
          <button type="button" className="easa-btn secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fill form modal ──────────────────────────────────────────────────────────

function FillFormModal({
  form,
  schema,
  onClose,
  onSubmitted,
}: {
  form: TrainingForm;
  schema: SchemaJson;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setValue(fieldId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit() {
    for (const field of schema.fields) {
      if (field.required) {
        const v = values[field.id];
        if (v === undefined || v === "" || v === null) {
          setError(`"${field.label || "A required field"}" is required.`);
          return;
        }
      }
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/training/forms/${form.id}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: values }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to submit");
      setSubmitting(false);
      return;
    }
    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="easa-card w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{form.title}</h2>
            {form.description && (
              <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                {form.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {schema.fields.length === 0 ? (
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            This form has no fields configured yet.
          </p>
        ) : (
          <div className="space-y-4">
            {schema.fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--easa-color-text-muted)]">
                  {field.label || "Untitled field"}
                  {field.required && (
                    <span className="ml-1 text-[var(--easa-color-accent-pink)]">*</span>
                  )}
                </label>
                {field.type === "text" && (
                  <input
                    className="easa-input w-full text-sm"
                    value={(values[field.id] as string) ?? ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                  />
                )}
                {field.type === "textarea" && (
                  <textarea
                    className="easa-input w-full min-h-24 text-sm"
                    value={(values[field.id] as string) ?? ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                  />
                )}
                {field.type === "number" && (
                  <input
                    type="number"
                    className="easa-input w-full text-sm"
                    value={(values[field.id] as string) ?? ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                  />
                )}
                {field.type === "date" && (
                  <input
                    type="date"
                    className="easa-input text-sm"
                    value={(values[field.id] as string) ?? ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                  />
                )}
                {field.type === "checkbox" && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(values[field.id] as boolean) ?? false}
                      onChange={(e) => setValue(field.id, e.target.checked)}
                    />
                    Yes
                  </label>
                )}
                {field.type === "select" && (
                  <select
                    className="easa-input text-sm"
                    value={(values[field.id] as string) ?? ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-xs text-[var(--easa-color-accent-pink)]">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="easa-btn primary"
            onClick={handleSubmit}
            disabled={submitting || schema.fields.length === 0}
          >
            {submitting ? "Submitting…" : "Submit form"}
          </button>
          <button type="button" className="easa-btn secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Submissions panel ────────────────────────────────────────────────────────

function SubmissionsPanel({
  formId,
  onClose,
}: {
  formId: string;
  onClose: () => void;
}) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/training/forms/${formId}/submissions`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((json) => setSubmissions(json.submissions ?? []))
      .catch(() => setError("Failed to load submissions"))
      .finally(() => setLoading(false));
  }, [formId]);

  return (
    <div className="mt-3 rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">Submissions</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
        >
          <X size={14} />
        </button>
      </div>
      {loading ? (
        <p className="text-xs text-[var(--easa-color-text-muted)]">Loading…</p>
      ) : error ? (
        <p className="text-xs text-[var(--easa-color-accent-pink)]">{error}</p>
      ) : submissions.length === 0 ? (
        <p className="text-xs text-[var(--easa-color-text-muted)]">No submissions yet.</p>
      ) : (
        <div className="divide-y divide-[var(--easa-color-border)]">
          {submissions.map((s) => (
            <div key={s.id} className="py-3 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium">
                  {s.studentName ?? s.student_user_id ?? "Unknown"}
                </p>
                <span
                  className={`easa-badge ${s.status === "submitted" ? "is-green" : ""}`}
                >
                  {s.status}
                </span>
              </div>
              <p className="text-xs text-[var(--easa-color-text-muted)]">
                Submitted {formatDate(s.submitted_at ?? s.created_at)}
              </p>
              {Object.keys(s.payload).length > 0 && (
                <div className="mt-2 rounded-[10px] bg-[var(--easa-color-surface)] p-3 space-y-1">
                  {Object.entries(s.payload).map(([k, v]) => (
                    <p key={k} className="text-xs">
                      <span className="text-[var(--easa-color-text-muted)]">{k}:</span>{" "}
                      {String(v)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Form card ────────────────────────────────────────────────────────────────

function FormCard({
  form,
  canManage,
  isAdmin,
  onDeleted,
  onRefresh,
}: {
  form: TrainingForm;
  canManage: boolean;
  isAdmin: boolean;
  onDeleted: () => void;
  onRefresh: () => void;
}) {
  const [schema, setSchema] = useState<SchemaJson | null>(null);
  const [filling, setFilling] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function openFillModal() {
    if (schema) {
      setFilling(true);
      return;
    }
    const res = await fetch(`/api/training/forms/${form.id}`);
    const json = await res.json();
    setSchema((json.form?.schema_json as SchemaJson) ?? { fields: [] });
    setFilling(true);
  }

  async function handleDelete() {
    if (!confirm(`Delete form "${form.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/training/forms/${form.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted();
    } else {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="easa-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold leading-snug">{form.title}</h3>
              {!form.active && (
                <span className="easa-badge">Inactive</span>
              )}
            </div>
            {form.description && (
              <p className="mt-1 text-xs text-[var(--easa-color-text-muted)] leading-relaxed">
                {form.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--easa-color-text-muted)]">
              {form.programmeName && (
                <span className="easa-badge is-blue">{form.programmeName}</span>
              )}
              <span>
                {form.submissionCount} submission{form.submissionCount !== 1 ? "s" : ""}
              </span>
              <span>Created {formatDate(form.createdAt)}</span>
            </div>
          </div>
        </div>

        {submitted && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--easa-color-accent-green)]">
            <CheckCircle size={13} strokeWidth={2} />
            Submitted successfully
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="easa-btn primary text-sm"
            onClick={openFillModal}
          >
            Fill form
          </button>
          {canManage && (
            <button
              type="button"
              className="easa-btn secondary text-sm"
              onClick={() => setShowSubmissions((v) => !v)}
            >
              {showSubmissions ? "Hide submissions" : "View submissions"}
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className="easa-btn secondary text-sm text-[var(--easa-color-accent-pink)]"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>

        {showSubmissions && (
          <SubmissionsPanel
            formId={form.id}
            onClose={() => setShowSubmissions(false)}
          />
        )}
      </div>

      {filling && schema && (
        <FillFormModal
          form={form}
          schema={schema}
          onClose={() => setFilling(false)}
          onSubmitted={() => {
            setFilling(false);
            setSubmitted(true);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TrainingFormsPage() {
  const [forms, setForms] = useState<TrainingForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // Derive canManage from whether creating forms is allowed — we'll show it for all non-students
  // by checking if the create button is accessible. We approximate role from server context
  // by attempting the call; for the UI gate we always show the button and let the API reject.
  const [canManage] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/training/forms")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((json) => setForms(json.forms ?? []))
      .catch(() => setError("Failed to load forms"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Training forms</h1>
            <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
              Create and distribute structured forms — ground exams, pre-solo checks,
              safety briefings — and collect student responses.
            </p>
          </div>
          <button
            type="button"
            className="easa-btn primary flex items-center gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={15} strokeWidth={1.75} />
            New form
          </button>
        </div>

        {loading ? (
          <div className="easa-card p-6">
            <p className="text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
          </div>
        ) : error ? (
          <div className="easa-card p-6">
            <p className="text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="easa-card p-10 text-center">
            <ClipboardList
              size={32}
              strokeWidth={1.5}
              className="mx-auto mb-3 text-[var(--easa-color-text-muted)]"
            />
            <p className="text-sm font-medium">No training forms yet</p>
            <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
              Create a form to distribute to students for exams, check-ins, or
              acknowledgements.
            </p>
            <button
              type="button"
              className="easa-btn primary mt-4 flex items-center gap-2 mx-auto"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={15} /> Create first form
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {forms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                canManage={canManage}
                isAdmin={canManage}
                onDeleted={load}
                onRefresh={load}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateFormModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </>
  );
}
