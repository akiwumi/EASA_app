import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ShieldAlert, AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { getOrgAccessContext } from "@/lib/supabase/access";
import AdvisoryList from "@/components/updates/AdvisoryList";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

type AdSibFinding = {
  id: string;
  doc_type: string;
  reference_number: string | null;
  title: string;
  applicability: string | null;
  compliance_date: string | null;
  compliance_category: string;
  effective_date: string | null;
  url: string | null;
  summary: string | null;
  status: string;
  created_at: string;
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default async function AdvisoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type ?? "all";
  const statusFilter = params.status ?? "open";

  const ctx = await getOrgAccessContext();
  const isAdmin = ctx?.role === "admin";

  const admin = getAdminClient();

  let query = admin
    .from("ad_sib_findings")
    .select("id, doc_type, reference_number, title, applicability, compliance_date, compliance_category, effective_date, url, summary, status, created_at")
    .order("compliance_date", { ascending: true, nullsFirst: false });

  if (ctx?.orgId) query = query.eq("organization_id", ctx.orgId);
  if (typeFilter !== "all") query = query.eq("doc_type", typeFilter);
  if (statusFilter !== "all") query = query.eq("status", statusFilter);

  const { data, error } = await query;
  const rows = (data ?? []) as AdSibFinding[];

  // Stats over all open items (unfiltered by type)
  const { data: allOpen } = await admin
    .from("ad_sib_findings")
    .select("doc_type, compliance_date, compliance_category")
    .eq("organization_id", ctx?.orgId ?? "")
    .eq("status", "open");

  const allOpenRows = allOpen ?? [];
  const adCount = allOpenRows.filter((r) => r.doc_type === "ad").length;
  const sibCount = allOpenRows.filter((r) => r.doc_type === "sib").length;
  const dueWithin90 = allOpenRows.filter((r) => {
    const d = daysUntil(r.compliance_date as string | null);
    return d !== null && d >= 0 && d <= 90;
  }).length;
  const mandatoryCount = allOpenRows.filter((r) => r.compliance_category === "mandatory").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Advisories tracker</h1>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            Airworthiness Directives and Safety Information Bulletins — compliance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/changes" className="easa-btn secondary text-sm">Change list</Link>
          {isAdmin && (
            <Link href="/updates/advisories/new" className="easa-btn primary flex items-center gap-2 text-sm">
              <Plus size={15} strokeWidth={1.75} /> Add advisory
            </Link>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="easa-card p-4">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Open ADs</p>
          <p className="mt-1 text-2xl font-bold text-[var(--easa-color-accent-red)]">{adCount}</p>
        </div>
        <div className="easa-card p-4">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Open SIBs</p>
          <p className="mt-1 text-2xl font-bold text-[var(--easa-color-accent-yellow)]">{sibCount}</p>
        </div>
        <div className="easa-card p-4">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Due within 90 days</p>
          <p className={`mt-1 text-2xl font-bold ${dueWithin90 > 0 ? "text-[var(--easa-color-accent-red)]" : "text-[var(--easa-color-text-primary)]"}`}>
            {dueWithin90}
          </p>
        </div>
        <div className="easa-card p-4">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Mandatory</p>
          <p className="mt-1 text-2xl font-bold">{mandatoryCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-xl border border-[var(--easa-color-border)] overflow-hidden text-sm">
          {[
            { value: "all", label: "All types" },
            { value: "ad", label: "ADs only" },
            { value: "sib", label: "SIBs only" },
          ].map(({ value, label }) => (
            <Link
              key={value}
              href={`/updates/advisories?type=${value}&status=${statusFilter}`}
              className={`px-3 py-1.5 transition ${
                typeFilter === value
                  ? "bg-[var(--easa-color-brand-primary)] text-white font-medium"
                  : "hover:bg-[var(--easa-color-surface-2)] text-[var(--easa-color-text-muted)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex rounded-xl border border-[var(--easa-color-border)] overflow-hidden text-sm">
          {[
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
            { value: "superseded", label: "Superseded" },
            { value: "all", label: "All" },
          ].map(({ value, label }) => (
            <Link
              key={value}
              href={`/updates/advisories?type=${typeFilter}&status=${value}`}
              className={`px-3 py-1.5 transition ${
                statusFilter === value
                  ? "bg-[var(--easa-color-brand-primary)] text-white font-medium"
                  : "hover:bg-[var(--easa-color-surface-2)] text-[var(--easa-color-text-muted)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-accent-pink)]">Failed to load advisories.</p>
        </div>
      )}

      {!error && rows.length === 0 && (
        <div className="easa-card p-10 text-center">
          <CheckCircle2 size={36} strokeWidth={1.25} className="mx-auto text-[var(--easa-color-accent-green)]" />
          <p className="mt-3 text-sm font-medium">No advisories found</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            {statusFilter === "open"
              ? "No open advisories — you're up to date."
              : "No advisories match the current filters."}
          </p>
          {isAdmin && (
            <Link href="/updates/advisories/new" className="easa-btn primary mt-4 inline-flex items-center gap-2 text-sm">
              <Plus size={15} strokeWidth={1.75} /> Add advisory
            </Link>
          )}
        </div>
      )}

      {!error && rows.length > 0 && (
        <AdvisoryList rows={rows} isAdmin={isAdmin} />
      )}
    </div>
  );
}
