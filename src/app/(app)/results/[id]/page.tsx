import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import ReviewPanel from "@/components/results/ReviewPanel";
import { getOrgAccessContext, ORG_APPROVER_ROLES } from "@/lib/supabase/access";

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
  const ctx = await getOrgAccessContext();

  const { data: finding } = await admin
    .from("ai_findings")
    .select(`id, impact, confidence, mapped_section, status, category, summary, created_at,
      rss_items ( title, summary, link, published_at, category )`)
    .eq("id", id)
    .maybeSingle();

  if (!finding) notFound();

  const rss = Array.isArray(finding.rss_items) ? finding.rss_items[0] : finding.rss_items;

  const impactColour =
    finding.impact === "High" ? "is-red" : finding.impact === "Medium" ? "is-orange" : "is-green";

  const publishedAt = rss?.published_at
    ? new Date(rss.published_at as string).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-5xl space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/results" className="easa-btn secondary text-sm">
          ← Back to results
        </Link>
        <span className="text-xs text-[var(--easa-color-text-muted)]">
          AI finding · {id.slice(0, 8)}…
        </span>
      </div>

      {/* ── Meta strip ───────────────────────────────────────────────────────── */}
      <div className="easa-card px-5 py-4 flex flex-wrap items-center gap-3">
        <span className={`easa-badge ${impactColour}`}>{finding.impact as string} impact</span>
        <span className="easa-badge is-blue">Confidence {finding.confidence as string}</span>
        <span className="easa-badge is-orange">{finding.status as string}</span>
        <span className="easa-badge is-purple">{finding.category as string}</span>
        {publishedAt && (
          <span className="ml-auto text-xs text-[var(--easa-color-text-muted)]">{publishedAt}</span>
        )}
      </div>

      {/* ── Review panel ─────────────────────────────────────────────────────── */}
      <ReviewPanel
        findingId={finding.id as string}
        canApprove={Boolean(ctx && ORG_APPROVER_ROLES.includes(ctx.role as (typeof ORG_APPROVER_ROLES)[number]))}
        update={{
          title: (rss?.title as string | null) ?? "EASA Update",
          summary: (rss?.summary as string | null) ?? null,
          link: (rss?.link as string | null) ?? null,
          publishedAt,
          category: (rss?.category as string | null) ?? null,
          aiSummary: (finding.summary as string | null) ?? "",
          mappedSection: (finding.mapped_section as string | null) ?? "",
        }}
      />
    </div>
  );
}
