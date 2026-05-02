"use client";

import { useEffect, useState } from "react";

type BrandingPayload = {
  schemaReady: boolean;
  branding: {
    public_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  } | null;
};

export default function BrandingTab() {
  const [form, setForm] = useState({
    public_name: "",
    logo_url: "",
    primary_color: "#1f4b99",
    secondary_color: "#87b4ff",
    contact_email: "",
    contact_phone: "",
  });
  const [schemaReady, setSchemaReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/branding");
      const payload = (await response.json()) as BrandingPayload | { error?: string };
      if (response.ok && "schemaReady" in payload) {
        setSchemaReady(payload.schemaReady);
        if (payload.branding) {
          setForm({
            public_name: payload.branding.public_name ?? "",
            logo_url: payload.branding.logo_url ?? "",
            primary_color: payload.branding.primary_color ?? "#1f4b99",
            secondary_color: payload.branding.secondary_color ?? "#87b4ff",
            contact_email: payload.branding.contact_email ?? "",
            contact_phone: payload.branding.contact_phone ?? "",
          });
        }
      } else {
        setMessage({ text: "Unable to load branding settings.", ok: false });
      }
      setLoading(false);
    }

    void load();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage({ text: payload.error ?? "Unable to save branding.", ok: false });
      setSaving(false);
      return;
    }
    setMessage({ text: "Branding settings saved.", ok: true });
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="easa-card p-6">
        <p className="text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="easa-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">School branding</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--easa-color-text-muted)]">
              Set the school-facing name and basic colours so the app looks like a real operational workspace during onboarding and demos.
            </p>
          </div>
          {message && (
            <p className={`text-sm ${message.ok ? "text-[var(--easa-color-accent-green)]" : "text-[var(--easa-color-accent-pink)]"}`}>
              {message.text}
            </p>
          )}
        </div>

        {!schemaReady && (
          <p className="mt-4 text-sm text-[var(--easa-color-text-muted)]">
            Branding settings will save after the Phase 3 Supabase migrations are applied.
          </p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-xs text-[var(--easa-color-text-muted)]">Public school name</span>
                <input
                  className="easa-input w-full"
                  value={form.public_name}
                  onChange={(event) => setForm((current) => ({ ...current, public_name: event.target.value }))}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-xs text-[var(--easa-color-text-muted)]">Logo URL</span>
                <input
                  className="easa-input w-full"
                  value={form.logo_url}
                  onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-xs text-[var(--easa-color-text-muted)]">Primary colour</span>
                <input
                  className="easa-input h-11 w-full"
                  type="color"
                  value={form.primary_color}
                  onChange={(event) => setForm((current) => ({ ...current, primary_color: event.target.value }))}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-xs text-[var(--easa-color-text-muted)]">Secondary colour</span>
                <input
                  className="easa-input h-11 w-full"
                  type="color"
                  value={form.secondary_color}
                  onChange={(event) => setForm((current) => ({ ...current, secondary_color: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-xs text-[var(--easa-color-text-muted)]">Support email</span>
                <input
                  className="easa-input w-full"
                  type="email"
                  value={form.contact_email}
                  onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-xs text-[var(--easa-color-text-muted)]">Support phone</span>
                <input
                  className="easa-input w-full"
                  value={form.contact_phone}
                  onChange={(event) => setForm((current) => ({ ...current, contact_phone: event.target.value }))}
                />
              </label>
            </div>

            <button className="easa-btn primary" disabled={saving || !schemaReady} onClick={save}>
              {saving ? "Saving…" : "Save branding"}
            </button>
          </div>

          <div className="rounded-[28px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
              Preview
            </p>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)]">
              <div
                className="p-5 text-white"
                style={{
                  background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`,
                }}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-white/70">School workspace</p>
                <p className="mt-2 text-xl font-semibold">
                  {form.public_name.trim() || "Your Flight School"}
                </p>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <p className="text-[var(--easa-color-text-secondary)]">
                  Contact: {form.contact_email || "ops@school.example"}
                  {form.contact_phone ? ` · ${form.contact_phone}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="easa-badge is-blue">Compliance review</span>
                  <span className="easa-badge is-green">Training delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
