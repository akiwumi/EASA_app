import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DiffViewer from "@/components/updates/DiffViewer";
import { getOrgAccessContext, ORG_APPROVER_ROLES } from "@/lib/supabase/access";

type JoinedUpdateRow = {
  id: string;
  classification: string | null;
  risk_level: string | null;
  confidence_score: number | null;
  status: string | null;
  ai_rationale: string | null;
  ai_suggested_text: string | null;
  flightbook_section_id: string | null;
  reg_changes?: unknown[] | unknown | null;
  flightbook_sections?: unknown[] | unknown | null;
};

type LegacyUpdateRow = {
  id: string;
  classification: string | null;
  risk_level: string | null;
  confidence_score: number | null;
  status: string | null;
  ai_rationale: string | null;
  ai_suggested_text: string | null;
  flightbook_section_id: string | null;
};

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST205" ||
    /column .* does not exist/i.test(error.message ?? "") ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export default async function UpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getOrgAccessContext();
  const orgId = ctx?.orgId ?? null;
  const role = ctx?.role ?? null;
  const canManage = role ? ORG_APPROVER_ROLES.includes(role as (typeof ORG_APPROVER_ROLES)[number]) : false;

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

  const { data: joinedData, error } = await query.maybeSingle();

  let data: JoinedUpdateRow | LegacyUpdateRow | null = joinedData as JoinedUpdateRow | null;
  if (error && isMissingSchemaError(error)) {
    let legacyQuery = admin
      .from("proposed_updates")
      .select(`
        id,
        classification,
        risk_level,
        confidence_score,
        status,
        ai_rationale,
        ai_suggested_text,
        flightbook_section_id
      `)
      .eq("id", id);

    if (orgId) legacyQuery = legacyQuery.eq("organization_id", orgId);

    const { data: legacyData, error: legacyError } = await legacyQuery.maybeSingle();
    if (legacyError || !legacyData) {
      notFound();
    }
    data = legacyData as LegacyUpdateRow;
  } else if (error || !data) {
    notFound();
  }

  // Unwrap nested joins (Supabase returns arrays for one-to-one FK relationships)
  const regChangesValue = "reg_changes" in data ? data.reg_changes : null;
  const regChange = Array.isArray(regChangesValue)
    ? regChangesValue[0]
    : regChangesValue;

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

  const flightbookSectionsValue = "flightbook_sections" in data ? data.flightbook_sections : null;
  const fbSection = Array.isArray(flightbookSectionsValue)
    ? flightbookSectionsValue[0]
    : flightbookSectionsValue;

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
        canManage={canManage}
      />
    </div>
  );
}
