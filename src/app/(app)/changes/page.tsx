import Link from "next/link";
import AggregateButton from "@/components/changes/AggregateButton";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/access";

// EASA regulation part display metadata
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
  "General":  { label: "General", colour: "is-orange" },
};

function partMeta(part: string | null) {
  const key = part ?? "General";
  return PART_META[key] ?? { label: key, colour: "is-orange" };
}

type RegChange = {
  id: string;
  reg_part: string | null;
  section_ref: string | null;
  change_type: string;
  diff_text: string | null;
  detected_at: string;
  ai_finding_id: string | null;
  ai_findings: {
    id: string;
    impact: string | null;
    confidence: string | null;
    category: string | null;
  } | null;
};

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ part?: string; type?: string }>;
}) {
  const { part: filterPart, type: filterType } = await searchParams;
  const admin = getOptionalSupabaseAdminClient();

  let changes: unknown[] = [];

  if (admin) {
    let query = admin
      .from("reg_changes")
      .select(`id, reg_part, section_ref, change_type, diff_text, detected_at, ai_finding_id,
        ai_findings ( id, impact, confidence, category )`)
      .order("detected_at", { ascending: false })
      .limit(500);

    if (filterPart) query = query.eq("reg_part", filterPart);
    if (filterType) query = query.eq("change_type", filterType);

    const result = await query;
    changes = result.data ?? [];
  }

  const rows = (changes ?? []) as unknown as RegChange[];

  // Group by reg_part
  const grouped = new Map<string, RegChange[]>();
  for (const row of rows) {
    const key = row.reg_part ?? "General";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  // Sorted by part name, General last
  const sortedParts = [...grouped.keys()].sort((a, b) => {
    if (a === "General") return 1;
    if (b === "General") return -1;
    return a.localeCompare(b);
  });

  // All distinct parts and types for filter chips
  const allParts = [...new Set((changes ?? []).map((c) => (c as { reg_part: string | null }).reg_part ?? "General"))].sort();
  const allTypes = [...new Set((changes ?? []).map((c) => (c as { change_type: string }).change_type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="easa-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs text-[var(--easa-color-text-muted)]">Regulation pipeline · Phase 2</p>
          <h1 className="mt-2 text-2xl font-semibold">Change list</h1>
          <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
            All detected EASA regulatory changes, grouped by regulation part.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="easa-btn secondary" href="/dashboard">Back to dashboard</Link>
          <AggregateButton />
        </div>
      </header>

      {/* Summary stats */}
      <section className="grid gap-4 sm:grid-cols-3">
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
          <p className="mt-2 text-2xl font-semibold">
            {rows.filter((r) => (r.ai_findings as RegChange["ai_findings"] | null)?.impact === "High").length}
          </p>
        </div>
      </section>

      {/* Filters */}
      {(allParts.length > 0 || allTypes.length > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-[var(--easa-color-text-muted)] self-center">Filter:</span>
          <Link
            href="/changes"
            className={`easa-badge ${!filterPart && !filterType ? "is-blue" : "is-muted"}`}
          >
            All
          </Link>
          {allParts.map((p) => (
            <Link
              key={p}
              href={`/changes?part=${encodeURIComponent(p)}${filterType ? `&type=${filterType}` : ""}`}
              className={`easa-badge ${filterPart === p ? "is-blue" : "is-muted"}`}
            >
              {p}
            </Link>
          ))}
          {allTypes.map((t) => (
            <Link
              key={t}
              href={`/changes?type=${t}${filterPart ? `&part=${encodeURIComponent(filterPart)}` : ""}`}
              className={`easa-badge ${filterType === t ? "is-orange" : "is-muted"}`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="easa-card p-8 text-center space-y-3">
          <p className="text-sm font-medium">No regulation changes yet</p>
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            Run the pipeline from the dashboard to ingest RSS feeds, generate AI findings, and aggregate reg changes.
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
                <div className="flex items-center gap-3">
                  <span className={`easa-badge ${meta.colour}`}>{part}</span>
                  <p className="text-sm font-medium">{meta.label}</p>
                </div>
                <span className="text-xs text-[var(--easa-color-text-muted)]">{items.length} change{items.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[var(--easa-color-border)]">
                {items.map((row) => {
                  const finding = row.ai_findings as RegChange["ai_findings"] | null;
                  const impactBadge =
                    finding?.impact === "High" ? "is-red" :
                    finding?.impact === "Medium" ? "is-orange" : "is-green";
                  const detectedDate = new Date(row.detected_at).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  });
                  return (
                    <div key={row.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                      {/* Change type + impact */}
                      <div className="flex flex-col items-start gap-1.5 shrink-0 w-24">
                        <span className="easa-badge is-muted capitalize">{row.change_type}</span>
                        {finding?.impact && (
                          <span className={`easa-badge ${impactBadge}`}>{finding.impact}</span>
                        )}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {row.section_ref && (
                          <p className="text-xs font-medium text-[var(--easa-color-text-muted)] truncate">
                            {row.section_ref}
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
