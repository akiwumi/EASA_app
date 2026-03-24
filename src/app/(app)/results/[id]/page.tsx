import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import AddToQueueButton from "@/components/results/AddToQueueButton";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdminClient();

  const { data: finding } = await admin
    .from("ai_findings")
    .select(`id, impact, confidence, mapped_section, status, category, summary, created_at,
      rss_items ( title, summary, link, published_at, category )`)
    .eq("id", id)
    .maybeSingle();

  if (!finding) notFound();

  const rss = Array.isArray(finding.rss_items) ? finding.rss_items[0] : finding.rss_items;

  const impactColour =
    finding.impact === "High" ? "is-red" :
    finding.impact === "Medium" ? "is-orange" : "is-green";

  return (
    <main className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/results" className="easa-btn secondary text-sm">← Back</Link>
        <span className="text-xs text-[var(--easa-color-text-muted)]">AI finding · {id.slice(0, 8)}…</span>
      </div>

      {/* RSS source */}
      <div className="easa-card p-6 space-y-3">
        <p className="text-xs font-medium text-[var(--easa-color-text-muted)] uppercase tracking-wide">Source update</p>
        <h1 className="text-lg font-semibold">{rss?.title ?? "Untitled"}</h1>
        <p className="text-sm text-[var(--easa-color-text-muted)]">
          {rss?.published_at ? new Date(rss.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Unknown date"}
          {rss?.category ? ` · ${rss.category}` : ""}
        </p>
        {rss?.summary && (
          <p className="text-sm text-[var(--easa-color-text-secondary)] leading-relaxed">{rss.summary}</p>
        )}
        {rss?.link && (
          <a href={rss.link} target="_blank" rel="noopener noreferrer"
            className="inline-block text-xs text-[var(--easa-color-accent-blue)] underline break-all">
            {rss.link}
          </a>
        )}
      </div>

      {/* AI analysis */}
      <div className="easa-card p-6 space-y-4">
        <p className="text-xs font-medium text-[var(--easa-color-text-muted)] uppercase tracking-wide">AI analysis</p>
        <div className="flex flex-wrap gap-2">
          <span className={`easa-badge ${impactColour}`}>{finding.impact} impact</span>
          <span className="easa-badge is-blue">Confidence {finding.confidence}</span>
          <span className="easa-badge is-orange">{finding.status}</span>
          <span className="easa-badge is-purple">{finding.category}</span>
        </div>
        <p className="text-sm text-[var(--easa-color-text-secondary)] leading-relaxed">{finding.summary}</p>
        <div className="rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Mapped flight book section</p>
          <p className="mt-1 text-sm font-medium">{finding.mapped_section || "—"}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <AddToQueueButton findingId={finding.id} />
        <Link href="/updates" className="easa-btn secondary">View update queue</Link>
      </div>
    </main>
  );
}
