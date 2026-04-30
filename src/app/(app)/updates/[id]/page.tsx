import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import DiffViewer from "@/components/updates/DiffViewer";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getOrgId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getAdminClient();
  const { data } = await admin
    .from("org_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data?.organization_id as string | null) ?? null;
}

export default async function UpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orgId = await getOrgId();

  const admin = getAdminClient();

  let query = admin
    .from("proposed_updates")
    .select(`
      id,
      classification,
      risk_level,
      confidence_score,
      status,
      ai_rationale,
      ai_suggested_text,
      flightbook_section_id,
      reg_changes (
        section_ref,
        change_type,
        diff_text,
        reg_part,
        ai_finding_id,
        ai_findings (
          summary,
          impact,
          confidence,
          rss_items (
            title,
            summary,
            link,
            published_at
          )
        )
      ),
      flightbook_sections (
        section_number,
        title,
        body,
        flightbooks (
          name
        )
      )
    `)
    .eq("id", id);

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    notFound();
  }

  // Unwrap nested joins (Supabase returns arrays for one-to-one FK relationships)
  const regChange = Array.isArray(data.reg_changes)
    ? data.reg_changes[0]
    : data.reg_changes;

  const finding = regChange
    ? Array.isArray((regChange as Record<string, unknown>).ai_findings)
      ? ((regChange as Record<string, unknown>).ai_findings as unknown[])[0]
      : (regChange as Record<string, unknown>).ai_findings
    : null;

  const rssItem = finding
    ? Array.isArray((finding as Record<string, unknown>).rss_items)
      ? ((finding as Record<string, unknown>).rss_items as unknown[])[0]
      : (finding as Record<string, unknown>).rss_items
    : null;

  const fbSection = Array.isArray(data.flightbook_sections)
    ? data.flightbook_sections[0]
    : data.flightbook_sections;

  const flightbook = fbSection
    ? Array.isArray((fbSection as Record<string, unknown>).flightbooks)
      ? ((fbSection as Record<string, unknown>).flightbooks as unknown[])[0]
      : (fbSection as Record<string, unknown>).flightbooks
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/updates"
          className="text-sm text-[var(--easa-color-text-muted)] transition hover:text-[var(--easa-color-text-primary)]"
        >
          ← Back to queue
        </Link>
      </div>

      <DiffViewer
        updateId={data.id as string}
        classification={data.classification as string}
        riskLevel={data.risk_level as string}
        confidenceScore={data.confidence_score as number | null}
        status={data.status as string}
        aiRationale={data.ai_rationale as string | null}
        aiSuggestedText={data.ai_suggested_text as string | null}
        flightbookSectionId={data.flightbook_section_id as string | null}
        regPart={((regChange as Record<string, unknown> | null)?.reg_part as string | null) ?? null}
        sectionRef={((regChange as Record<string, unknown> | null)?.section_ref as string | null) ?? null}
        changeType={((regChange as Record<string, unknown> | null)?.change_type as string) ?? "unknown"}
        diffText={((regChange as Record<string, unknown> | null)?.diff_text as string | null) ?? null}
        findingId={((regChange as Record<string, unknown> | null)?.ai_finding_id as string | null) ?? null}
        rssTitle={((rssItem as Record<string, unknown> | null)?.title as string | null) ?? null}
        rssSummary={((rssItem as Record<string, unknown> | null)?.summary as string | null) ?? null}
        rssLink={((rssItem as Record<string, unknown> | null)?.link as string | null) ?? null}
        publishedAt={((rssItem as Record<string, unknown> | null)?.published_at as string | null) ?? null}
        aiImpact={((finding as Record<string, unknown> | null)?.impact as string | null) ?? null}
        aiConfidence={((finding as Record<string, unknown> | null)?.confidence as string | null) ?? null}
        aiSummary={((finding as Record<string, unknown> | null)?.summary as string | null) ?? null}
        sectionNumber={((fbSection as Record<string, unknown> | null)?.section_number as string | null) ?? null}
        sectionTitle={((fbSection as Record<string, unknown> | null)?.title as string | null) ?? null}
        sectionBody={((fbSection as Record<string, unknown> | null)?.body as string | null) ?? null}
        flightbookName={((flightbook as Record<string, unknown> | null)?.name as string | null) ?? null}
      />
    </div>
  );
}
