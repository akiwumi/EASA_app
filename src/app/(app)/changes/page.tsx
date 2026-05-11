import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { AlertTriangle, ShieldAlert, BookOpen } from "lucide-react";
import AggregateButton from "@/components/changes/AggregateButton";
import { CATEGORY_META, type SourceCategory } from "@/lib/seed-default-sources";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const PART_META: Record<string, { label: string; colour: string }> = {
  "Part-FCL": { label: "Part-FCL · Flight Crew Licensing", colour: "is-blue" },
  "Part-MED": { label: "Part-MED · Medical", colour: "is-red" },
  "Part-ORO": { label: "Part-ORO · Organisation Requirements", colour: "is-orange" },
  "Part-ORA": { label: "Part-ORA · Approved Training Organisations", colour: "is-purple" },
  "Part-ARO": { label: "Part-ARO · Authority Requirements", colour: "is-orange" },
  "Part-M":   { label: "Part-M · Continuing Airworthiness", colour: "is-green" },
  "Part-145": { label: "Part-145 · Maintenance", colour: "is-green" },
  "Part-CAT": { label: "Part-CAT · Commercial Air Transport", colour: "is-blue" },
  "Part-NCO": { label: "Part-NCO · Non-Commercial Operations", colour: "is-blue" },
  "Part-ADR": { label: "Part-ADR · Aerodromes", colour: "is-purple" },
  "Part-ATM/ANS": { label: "Part-ATM/ANS · Air Traffic Management", colour: "is-orange" },
  "General":  { label: "General", colour: "is-muted" },
};

function partMeta(part: string | null) {
  const key = part ?? "General";
  return PART_META[key] ?? { label: key, colour: "is-muted" };
}

function docTypeMeta(docType: string | null, category: SourceCategory | null) {
  if (category && CATEGORY_META[category]) return CATEGORY_META[category];
  if (docType === "ad")  return { label: "AD", colour: "is-red", description: "Airworthiness Directive" };
  if (docType === "sib") return { label: "SIB", colour: "is-yellow", description: "Safety Information Bulletin" };
  if (docType === "easy_access_rules") return CATEGORY_META.easy_access_rules;
  if (docType === "amcgm") return CATEGORY_META.amcgm;
  if (docType === "agency_decisions") return CATEGORY_META.agency_decisions;
  return null;
}

type RegChange = {
  id: string;
  reg_part: string | null;
  section_ref: string | null;
  change_type: string;
  diff_text: string | null;
  detected_at: string;
  ai_finding_id: string | null;
  source_category: SourceCategory | null;
  source_label: string | null;
  ai_findings: {
    id: string;
    impact: string | null;
    confidence: string | null;
    category: string | null;
  } | null;
};

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

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ part?: string; type?: string; cat?: string }>;
}) {
  const { part: filterPart, type: filterType, cat: filterCat } = await searchParams;
  const admin = getAdminClient();

  // Fetch reg changes with source category join
  let query = admin
    .from("reg_changes")
    .select(`
      id, reg_part, section_ref, change_type, diff_text, detected_at, ai_finding_id,
      sources ( category, label ),
      ai_findings ( id, impact, confidence, category )
    `)
    .order("detected_at", { ascending: false })
    .limit(500);

  if (filterPart) query = query.eq("reg_part", filterPart);
  if (filterType) query = query.eq("change_type", filterType);

  const { data: changes } = await query;

  // Fetch AD/SIB findings
  const { data: advisories } = await admin
    .from("ad_sib_findings")
    .select("id, doc_type, reference_number, title, applicability, compliance_date, compliance_category, effective_date, url, summary, status, created_at")
    .order("compliance_date", { ascending: true, nullsFirst: false })
    .limit(50);

  const rows = ((changes ?? []) as unknown as (Omit<RegChange, "source_category" | "source_label"> & {
    sources: { category: SourceCategory | null; label: string | null } | null;
  })[]).map((c) => ({
    ...c,
    source_category: c.sources?.category ?? null,
    source_label: c.sources?.label ?? null,
  })) as RegChange[];

  const adSibRows = (advisories ?? []) as AdSibFinding[];

  // Filter by source category
  const filteredRows = filterCat
    ? rows.filter((r) => r.source_category === filterCat)
    : rows;

  // Group by reg_part
  const grouped = new Map<string, RegChange[]>();
  for (const row of filteredRows) {
    const key = row.reg_part ?? "General";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const sortedParts = [...grouped.keys()].sort((a, b) => {
    if (a === "General") return 1;
    if (b === "General") return -1;
    return a.localeCompare(b);
  });

  const allParts = [...new Set(rows.map((c) => c.reg_part ?? "General"))].sort();
  const allTypes = [...new Set(rows.map((c) => c.change_type))];
  const allCats  = [...new Set(rows.map((c) => c.source_category).filter(Boolean))] as SourceCategory[];

  const openAds = adSibRows.filter((a) => a.doc_type === "ad" && a.status === "open");
  const openSibs = adSibRows.filter((a) => a.doc_type === "sib" && a.status === "open");

  const urgentAds = openAds.filter((a) => {
    if (!a.compliance_date) return false;
    const daysUntil = (new Date(a.compliance_date).getTime() - Date.now()) / 86_400_000;
    return daysUntil <= 90;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="easa-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs text-[var(--easa-color-text-muted)]">Regulatory monitoring</p>
          <h1 className="mt-1 text-2xl font-semibold">Change list</h1>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            All detected EASA regulatory changes, grouped by regulation part.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="easa-btn secondary" href="/updates/advisories">Advisories tracker</Link>
          <Link className="easa-btn secondary" href="/dashboard">Dashboard</Link>
          <AggregateButton />
        </div>
      </header>

      {/* AD/SIB alert banner */}
      {(urgentAds.length > 0 || openSibs.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {urgentAds.length > 0 && (
            <div className="easa-card border border-[var(--easa-color-accent-red)]/30 p-4 flex items-start gap-3">
              <ShieldAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--easa-color-accent-red)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--easa-color-accent-red)]">
                  {urgentAds.length} AD{urgentAds.length !== 1 ? "s" : ""} due within 90 days
                </p>
                <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                  Check applicability against your fleet.
                </p>
                <Link href="/updates/advisories?type=ad" className="mt-2 inline-block text-xs text-[var(--easa-color-accent-red)] underline">
                  View ADs →
                </Link>
              </div>
            </div>
          )}
          {openSibs.length > 0 && (
            <div className="easa-card border border-[var(--easa-color-accent-yellow)]/30 p-4 flex items-start gap-3">
              <AlertTriangle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--easa-color-accent-yellow)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--easa-color-accent-yellow)]">
                  {openSibs.length} open SIB{openSibs.length !== 1 ? "s" : ""}
                </p>
                <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                  Safety recommendations — review for voluntary action.
                </p>
                <Link href="/updates/advisories?type=sib" className="mt-2 inline-block text-xs text-[var(--easa-color-accent-yellow)] underline">
                  View SIBs →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary stats */}
      <section className="grid gap-4 sm:grid-cols-4">
        <div className="easa-card p-5">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Total changes</p>
          <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
        </div>
        <div className="easa-card p-5">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Regulation parts</p>
          <p className="mt-2 text-2xl font-semibold">{grouped.size}</p>
        </div>
        <div className="easa-card p-5">
          <p className="text-xs text-[var(--easa-color-text-muted)]">High impact</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--easa-color-accent-red)]">
            {rows.filter((r) => r.ai_findings?.impact === "High").length}
          </p>
        </div>
        <div className="easa-card p-5">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Open advisories</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--easa-color-accent-orange)]">
            {openAds.length + openSibs.length}
          </p>
        </div>
      </section>

      {/* Filters */}
      {(allParts.length > 0 || allTypes.length > 0 || allCats.length > 0) && (
        <div className="easa-card p-4 space-y-3">
          {/* Document type / source category filter */}
          {allCats.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-[var(--easa-color-text-muted)] self-center w-20 shrink-0">Source type</span>
              <Link
                href={`/changes${filterPart ? `?part=${encodeURIComponent(filterPart)}` : ""}${filterType ? `${filterPart ? "&" : "?"}type=${filterType}` : ""}`}
                className={`easa-badge ${!filterCat ? "is-blue" : "is-muted"}`}
              >
                All
              </Link>
              {allCats.map((cat) => {
                const meta = CATEGORY_META[cat];
                const params = new URLSearchParams();
                if (filterPart) params.set("part", filterPart);
                if (filterType) params.set("type", filterType);
                params.set("cat", cat);
                return (
                  <Link
                    key={cat}
                    href={`/changes?${params}`}
                    className={`easa-badge ${filterCat === cat ? meta.colour : "is-muted"}`}
                  >
                    {meta.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Regulation part filter */}
          {allParts.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-[var(--easa-color-text-muted)] self-center w-20 shrink-0">Part</span>
              <Link href="/changes" className={`easa-badge ${!filterPart && !filterType ? "is-blue" : "is-muted"}`}>
                All
              </Link>
              {allParts.map((p) => (
                <Link
                  key={p}
                  href={`/changes?part=${encodeURIComponent(p)}${filterType ? `&type=${filterType}` : ""}${filterCat ? `&cat=${filterCat}` : ""}`}
                  className={`easa-badge ${filterPart === p ? "is-blue" : "is-muted"}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}

          {/* Change type filter */}
          {allTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-[var(--easa-color-text-muted)] self-center w-20 shrink-0">Change type</span>
              {allTypes.map((t) => (
                <Link
                  key={t}
                  href={`/changes?type=${t}${filterPart ? `&part=${encodeURIComponent(filterPart)}` : ""}${filterCat ? `&cat=${filterCat}` : ""}`}
                  className={`easa-badge ${filterType === t ? "is-orange" : "is-muted"}`}
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {filteredRows.length === 0 && (
        <div className="easa-card p-8 text-center space-y-3">
          <BookOpen size={32} strokeWidth={1.25} className="mx-auto text-[var(--easa-color-text-muted)]" />
          <p className="text-sm font-medium">No regulation changes yet</p>
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            Run the pipeline from the dashboard to ingest EASA sources and detect changes.
          </p>
          <Link href="/dashboard" className="easa-btn primary inline-flex">Go to dashboard</Link>
        </div>
      )}

      {/* Grouped change list */}
      <div className="space-y-6">
        {sortedParts.map((part) => {
          const items = grouped.get(part)!;
          const meta = partMeta(part);
          return (
            <section key={part} className="easa-card overflow-hidden">
              {/* Part header */}
              <div className="flex items-center justify-between gap-4 border-b border-[var(--easa-color-border)] px-5 py-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`easa-badge ${meta.colour}`}>{part}</span>
                  <p className="text-sm font-medium">{meta.label}</p>
                  {/* Show source category breakdown */}
                  {[...new Set(items.map((i) => i.source_category).filter(Boolean))].map((cat) => {
                    const catMeta = CATEGORY_META[cat as SourceCategory];
                    return catMeta ? (
                      <span key={cat} className={`easa-badge ${catMeta.colour} text-[10px]`}>
                        {catMeta.label}
                      </span>
                    ) : null;
                  })}
                </div>
                <span className="text-xs text-[var(--easa-color-text-muted)] shrink-0">
                  {items.length} change{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[var(--easa-color-border)]">
                {items.map((row) => {
                  const finding = row.ai_findings;
                  const impactBadge =
                    finding?.impact === "High" ? "is-red" :
                    finding?.impact === "Medium" ? "is-orange" : "is-green";
                  const detectedDate = new Date(row.detected_at).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  });
                  const srcMeta = row.source_category ? docTypeMeta(null, row.source_category) : null;

                  return (
                    <div key={row.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                      {/* Change type + impact */}
                      <div className="flex flex-col items-start gap-1.5 shrink-0 w-28">
                        <span className="easa-badge is-muted capitalize">{row.change_type}</span>
                        {finding?.impact && (
                          <span className={`easa-badge ${impactBadge}`}>{finding.impact}</span>
                        )}
                        {srcMeta && (
                          <span className={`easa-badge ${srcMeta.colour} text-[10px]`}>
                            {srcMeta.label}
                          </span>
                        )}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {row.section_ref && (
                          <p className="text-xs font-medium text-[var(--easa-color-text-muted)] truncate">
                            {row.section_ref}
                          </p>
                        )}
                        {row.source_label && (
                          <p className="text-xs text-[var(--easa-color-text-muted)] italic">
                            {row.source_label}
                          </p>
                        )}
                        {row.diff_text && (
                          <p className="text-sm text-[var(--easa-color-text-secondary)] leading-relaxed line-clamp-2">
                            {row.diff_text}
                          </p>
                        )}
                        <p className="text-xs text-[var(--easa-color-text-muted)]">
                          Detected {detectedDate}
                          {finding?.confidence ? ` · Confidence ${finding.confidence}` : ""}
                        </p>
                      </div>

                      {/* Action */}
                      {row.ai_finding_id && (
                        <Link
                          href={`/results/${row.ai_finding_id}`}
                          className="easa-btn secondary shrink-0 text-xs"
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
