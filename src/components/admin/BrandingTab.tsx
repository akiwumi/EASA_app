"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BrandingPayload = {
  schemaReady: boolean;
  branding: {
    public_name: string | null;
    legal_name: string | null;
    logo_url: string | null;
    website_url: string | null;
    school_code: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
    billing_contact_name: string | null;
    billing_email: string | null;
    billing_phone: string | null;
    billing_address: string | null;
    vat_number: string | null;
    billing_notes: string | null;
  } | null;
};

type BillingPayload = {
  stripeConfigured: boolean;
  trialDays: number;
  subscription: {
    billing_state: string;
    subscription_status: string;
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    trial_end: string | null;
    stripe_customer_id: string | null;
  } | null;
};

const DEFAULT_FORM = {
  public_name: "",
  legal_name: "",
  logo_url: "",
  website_url: "",
  school_code: "",
  primary_color: "#1f4b99",
  secondary_color: "#87b4ff",
  contact_email: "",
  contact_phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
  billing_contact_name: "",
  billing_email: "",
  billing_phone: "",
  billing_address: "",
  vat_number: "",
  billing_notes: "",
};

export default function BrandingTab() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [schemaReady, setSchemaReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billing, setBilling] = useState<BillingPayload | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      const [brandingResponse, billingResponse] = await Promise.all([
        fetch("/api/admin/branding"),
        fetch("/api/admin/billing"),
      ]);
      const payload = (await brandingResponse.json()) as BrandingPayload | { error?: string };
      const billingPayload = (await billingResponse.json()) as BillingPayload | { error?: string };

      if (brandingResponse.ok && "schemaReady" in payload) {
        setSchemaReady(payload.schemaReady);
        if (payload.branding) {
          setForm({
            public_name: payload.branding.public_name ?? "",
            legal_name: payload.branding.legal_name ?? "",
            logo_url: payload.branding.logo_url ?? "",
            website_url: payload.branding.website_url ?? "",
            school_code: payload.branding.school_code ?? "",
            primary_color: payload.branding.primary_color ?? "#1f4b99",
            secondary_color: payload.branding.secondary_color ?? "#87b4ff",
            contact_email: payload.branding.contact_email ?? "",
            contact_phone: payload.branding.contact_phone ?? "",
            address_line1: payload.branding.address_line1 ?? "",
            address_line2: payload.branding.address_line2 ?? "",
            city: payload.branding.city ?? "",
            region: payload.branding.region ?? "",
            postal_code: payload.branding.postal_code ?? "",
            country: payload.branding.country ?? "",
            billing_contact_name: payload.branding.billing_contact_name ?? "",
            billing_email: payload.branding.billing_email ?? "",
            billing_phone: payload.branding.billing_phone ?? "",
            billing_address: payload.branding.billing_address ?? "",
            vat_number: payload.branding.vat_number ?? "",
            billing_notes: payload.branding.billing_notes ?? "",
          });
        }
      } else {
        setMessage({ text: "Unable to load school settings.", ok: false });
      }

      if (billingResponse.ok && "trialDays" in billingPayload) {
        setBilling(billingPayload);
      }

      setLoading(false);
      setBillingLoading(false);
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
      setMessage({ text: payload.error ?? "Unable to save school settings.", ok: false });
      setSaving(false);
      return;
    }
    setMessage({ text: "School profile and billing settings saved.", ok: true });
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
            <h2 className="text-base font-semibold">School profile and billing</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--easa-color-text-muted)]">
              Admins control the official school identity, operational contact details, and billing contacts from one place.
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
            These settings will save after the new organization profile migration is applied.
          </p>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Workspace access</h3>
                <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                  Each registered school can manage subscription status and start Stripe checkout from the pricing page.
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                {billingLoading ? (
                  <p className="text-sm text-[var(--easa-color-text-muted)]">Loading billing status…</p>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const billingState = billing?.subscription?.billing_state ?? "inactive";
                      return (
                        <>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="easa-badge is-blue">
                        {billingState}
                      </span>
                      <span className="text-[var(--easa-color-text-muted)]">
                        {billingState === "active"
                          ? "Subscription access enabled"
                          : "Access state recorded for this school"}
                      </span>
                    </div>
                    {billing?.subscription?.current_period_end ? (
                      <p className="text-xs text-[var(--easa-color-text-muted)]">
                        Current period ends: {new Date(billing.subscription.current_period_end).toLocaleString()}
                      </p>
                    ) : null}
                    <p className="text-xs text-[var(--easa-color-text-muted)]">
                      Stripe checkout starts with a 7 day free trial. Subscription events update this access state automatically.
                    </p>
                    <Link className="easa-btn primary w-fit" href="/pricing">
                      Manage Stripe plan
                    </Link>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Identity</h3>
                <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                  The public and legal details used across the workspace.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Public school name</span>
                  <input className="easa-input w-full" value={form.public_name} onChange={(event) => setForm((current) => ({ ...current, public_name: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Legal entity name</span>
                  <input className="easa-input w-full" value={form.legal_name} onChange={(event) => setForm((current) => ({ ...current, legal_name: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Website URL</span>
                  <input className="easa-input w-full" type="url" value={form.website_url} onChange={(event) => setForm((current) => ({ ...current, website_url: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">School code / org number</span>
                  <input className="easa-input w-full" value={form.school_code} onChange={(event) => setForm((current) => ({ ...current, school_code: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Logo URL</span>
                  <input className="easa-input w-full" type="url" value={form.logo_url} onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))} />
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">School contact details</h3>
                <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                  Shared operational details students and staff can reference.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Support email</span>
                  <input className="easa-input w-full" type="email" value={form.contact_email} onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Support phone</span>
                  <input className="easa-input w-full" value={form.contact_phone} onChange={(event) => setForm((current) => ({ ...current, contact_phone: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Address line 1</span>
                  <input className="easa-input w-full" value={form.address_line1} onChange={(event) => setForm((current) => ({ ...current, address_line1: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Address line 2</span>
                  <input className="easa-input w-full" value={form.address_line2} onChange={(event) => setForm((current) => ({ ...current, address_line2: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">City</span>
                  <input className="easa-input w-full" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Region / state</span>
                  <input className="easa-input w-full" value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Postal code</span>
                  <input className="easa-input w-full" value={form.postal_code} onChange={(event) => setForm((current) => ({ ...current, postal_code: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Country</span>
                  <input className="easa-input w-full" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Billing</h3>
                <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                  Only admins can access and edit these billing details.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Billing contact name</span>
                  <input className="easa-input w-full" value={form.billing_contact_name} onChange={(event) => setForm((current) => ({ ...current, billing_contact_name: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Billing email</span>
                  <input className="easa-input w-full" type="email" value={form.billing_email} onChange={(event) => setForm((current) => ({ ...current, billing_email: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Billing phone</span>
                  <input className="easa-input w-full" value={form.billing_phone} onChange={(event) => setForm((current) => ({ ...current, billing_phone: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">VAT / tax number</span>
                  <input className="easa-input w-full" value={form.vat_number} onChange={(event) => setForm((current) => ({ ...current, vat_number: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Billing address</span>
                  <textarea className="easa-input min-h-24 w-full" value={form.billing_address} onChange={(event) => setForm((current) => ({ ...current, billing_address: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Billing notes</span>
                  <textarea className="easa-input min-h-24 w-full" value={form.billing_notes} onChange={(event) => setForm((current) => ({ ...current, billing_notes: event.target.value }))} />
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Workspace colours</h3>
                <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                  These are still used for the school-branded interface.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Primary colour</span>
                  <input className="easa-input h-11 w-full" type="color" value={form.primary_color} onChange={(event) => setForm((current) => ({ ...current, primary_color: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-xs text-[var(--easa-color-text-muted)]">Secondary colour</span>
                  <input className="easa-input h-11 w-full" type="color" value={form.secondary_color} onChange={(event) => setForm((current) => ({ ...current, secondary_color: event.target.value }))} />
                </label>
              </div>
            </section>

            <button className="easa-btn primary" disabled={saving || !schemaReady} onClick={save}>
              {saving ? "Saving…" : "Save school settings"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
                Workspace preview
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
                  <p className="mt-2 text-sm text-white/82">
                    {form.legal_name.trim() || "Legal entity name"}
                  </p>
                </div>
                <div className="space-y-3 p-5 text-sm">
                  <p className="text-[var(--easa-color-text-secondary)]">
                    Contact: {form.contact_email || "ops@school.example"}
                    {form.contact_phone ? ` · ${form.contact_phone}` : ""}
                  </p>
                  <p className="text-[var(--easa-color-text-muted)]">
                    {form.city || "City"}
                    {form.country ? `, ${form.country}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="easa-badge is-blue">Admin billing control</span>
                    <span className="easa-badge is-green">Verified school profile</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-5 text-sm text-[var(--easa-color-text-muted)]">
              <p className="font-medium text-[var(--easa-color-text-primary)]">What this unlocks</p>
              <p className="mt-2">Admins can keep the legal, contact, and billing record in-app instead of splitting it across onboarding docs and email threads.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
