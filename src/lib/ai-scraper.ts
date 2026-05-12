import { createClient } from "@supabase/supabase-js";
import { getOrgAccessContext } from "@/lib/supabase/access";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export type EasaUpdate = {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  category: string;
  impact: "High" | "Medium" | "Low";
  confidence: string;
  mappedSection: string;
  status: "New" | "Analyzed" | "Ready";
  queuedUpdateId?: string | null;
  queuedDraftReady?: boolean;
  deletedAt?: string | null;
};

export const EASA_RSS_FEEDS = [
  "https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml",
  "https://www.easa.europa.eu/en/newsroom-and-events/press-releases/feed.xml",
  "https://www.easa.europa.eu/en/document-library/notices-of-proposed-amendment/feed.xml",
  "https://www.easa.europa.eu/en/document-library/opinions/feed.xml",
  "https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml",
  "https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/feed.xml",
];

const MOCK_UPDATES: EasaUpdate[] = [
  {
    id: "easa-2026-01-24-001",
    title: "Part-FCL — Medical validity periods adjusted",
    summary:
      "Updated time windows for Class 1 medical renewals and clarified renewal documentation.",
    publishedAt: "2026-01-24",
    category: "Aircrew",
    impact: "High",
    confidence: "92%",
    mappedSection: "Training Manual 3.4.2",
    status: "New",
  },
  {
    id: "easa-2026-01-24-002",
    title: "OPS Part-NCC — Fuel reserve planning",
    summary:
      "Expanded alternate planning language and added clarification for contingency fuel.",
    publishedAt: "2026-01-24",
    category: "Operations",
    impact: "Medium",
    confidence: "78%",
    mappedSection: "Operations SOP 4.2",
    status: "Analyzed",
  },
  {
    id: "easa-2026-01-23-001",
    title: "AMC/GM — Night operations syllabus",
    summary:
      "Added instructor sign-off requirements and expanded briefing checklist guidance.",
    publishedAt: "2026-01-23",
    category: "Training",
    impact: "Low",
    confidence: "88%",
    mappedSection: "Training Manual 2.8.1",
    status: "Ready",
  },
  {
    id: "easa-2026-01-23-002",
    title: "Safety management — Occurrence reporting cadence",
    summary:
      "Clarified the reporting interval for minor events and introduced a new template.",
    publishedAt: "2026-01-23",
    category: "Safety",
    impact: "Medium",
    confidence: "74%",
    mappedSection: "Safety SMS 1.6",
    status: "Analyzed",
  },
];

export type CollatedUpdates = {
  updatedAt: string;
  items: EasaUpdate[];
  deletedItems: EasaUpdate[];
  byCategory: Record<string, number>;
  byImpact: Record<string, number>;
  source: "supabase" | "mock";
  fallbackReason: string | null;
};

function buildCollation(
  items: EasaUpdate[],
  updatedAt: string,
  options?: { deletedItems?: EasaUpdate[]; source?: "supabase" | "mock"; fallbackReason?: string | null },
): CollatedUpdates {
  const byCategory: Record<string, number> = {};
  const byImpact: Record<string, number> = {};

  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    byImpact[item.impact] = (byImpact[item.impact] ?? 0) + 1;
  }

  return {
    updatedAt,
    items,
    deletedItems: options?.deletedItems ?? [],
    byCategory,
    byImpact,
    source: options?.source ?? "supabase",
    fallbackReason: options?.fallbackReason ?? null,
  };
}

function isMissingDeletedColumnError(error: { message?: string | null; code?: string | null } | null | undefined) {
  return (
    error?.code === "42703" ||
    /column .*deleted_at.* does not exist/i.test(error?.message ?? "") ||
    /could not find the 'deleted_at' column/i.test(error?.message ?? "")
  );
}

export async function fetchAiScrapedUpdates(orgId?: string): Promise<CollatedUpdates> {
  const allowMockFallback = process.env.EASA_ENABLE_MOCK_UPDATES === "true";

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (allowMockFallback) {
      return buildCollation(MOCK_UPDATES, "2026-01-24 06:26 UTC", {
        source: "mock",
        fallbackReason: "Mock updates shown because Supabase credentials are missing.",
      });
    }

    return buildCollation([], "Supabase not configured", {
      source: "supabase",
      fallbackReason:
        "Supabase credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or enable EASA_ENABLE_MOCK_UPDATES=true for seeded demo data.",
    });
  }

  const supabase = getAdminClient();
  const ctx = await getOrgAccessContext();

  if (!ctx) {
    return buildCollation([], "Login required", {
      source: "supabase",
      fallbackReason: null,
    });
  }

  let query = supabase
    .from("ai_findings")
    .select(
      `
        id,
        impact,
        confidence,
        mapped_section,
        status,
        category,
        summary,
        organization_id,
        created_at,
        deleted_at,
        rss_items (
          title,
          summary,
          published_at,
          category,
          link
        )
      `,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  // Scope to the org's own findings plus any global (null-org) findings.
  if (orgId) {
    query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
  } else {
    query = query.eq("organization_id", ctx.orgId);
  }

  query = query.is("deleted_at", null);

  let { data, error } = await query;

  if (error && isMissingDeletedColumnError(error)) {
    let fallbackQuery = supabase
      .from("ai_findings")
      .select(
        `
          id,
          impact,
          confidence,
          mapped_section,
          status,
          category,
          summary,
          organization_id,
          created_at,
          rss_items (
            title,
            summary,
            published_at,
            category,
            link
          )
        `,
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (orgId) {
      fallbackQuery = fallbackQuery.or(`organization_id.eq.${orgId},organization_id.is.null`);
    } else {
      fallbackQuery = fallbackQuery.eq("organization_id", ctx.orgId);
    }

    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data?.map((finding) => ({ ...finding, deleted_at: null })) ?? null;
    error = fallbackResult.error;
  }

  if (error || !data) {
    if (allowMockFallback) {
      return buildCollation(MOCK_UPDATES, "2026-01-24 06:26 UTC", {
        source: "mock",
        fallbackReason: `Mock updates shown because live findings could not be loaded${error?.message ? `: ${error.message}` : "."}`,
      });
    }

    return buildCollation([], error?.message ?? "No results available", {
      source: "supabase",
      fallbackReason: error?.message ?? "Live findings could not be loaded.",
    });
  }

  const findingIds = data.map((finding) => String(finding.id));
  const queuedByFindingId = new Map<string, { id: string; draftReady: boolean }>();

  if (findingIds.length > 0) {
    const orgIds = Array.from(
      new Set(
        data
          .map((finding) => finding.organization_id)
          .filter((orgId): orgId is string => typeof orgId === "string" && orgId.length > 0),
      ),
    );
    const summaries = Array.from(
      new Set(
        data
          .map((finding) => finding.summary)
          .filter((summary): summary is string => typeof summary === "string" && summary.length > 0),
      ),
    );

    const { data: regChanges } = await supabase
      .from("reg_changes")
      .select("id, ai_finding_id")
      .in("ai_finding_id", findingIds);

    const regChangeIds = (regChanges ?? []).map((row) => String(row.id));
    const findingByRegChangeId = new Map(
      (regChanges ?? []).map((row) => [String(row.id), String(row.ai_finding_id)]),
    );

    if (regChangeIds.length > 0) {
      const { data: queuedByRegChange } = await supabase
        .from("proposed_updates")
        .select("id, reg_change_id, ai_suggested_text")
        .in("reg_change_id", regChangeIds);

      for (const row of queuedByRegChange ?? []) {
        const findingId = findingByRegChangeId.get(String(row.reg_change_id));
        if (findingId && !queuedByFindingId.has(findingId)) {
          queuedByFindingId.set(findingId, {
            id: String(row.id),
            draftReady: Boolean(row.ai_suggested_text),
          });
        }
      }
    }

    if (orgIds.length > 0 && summaries.length > 0) {
      const { data: queuedByRationale } = await supabase
        .from("proposed_updates")
        .select("id, organization_id, ai_rationale, ai_suggested_text")
        .in("organization_id", orgIds)
        .in("ai_rationale", summaries);

      const findingByOrgAndSummary = new Map(
        data.map((finding) => [
          `${finding.organization_id ?? ""}\u0000${finding.summary ?? ""}`,
          String(finding.id),
        ]),
      );

      for (const row of queuedByRationale ?? []) {
        const findingId = findingByOrgAndSummary.get(`${row.organization_id ?? ""}\u0000${row.ai_rationale ?? ""}`);
        if (findingId && !queuedByFindingId.has(findingId)) {
          queuedByFindingId.set(findingId, {
            id: String(row.id),
            draftReady: Boolean(row.ai_suggested_text),
          });
        }
      }
    }
  }

  const items: EasaUpdate[] = data.map((finding) => {
    const rssItem = Array.isArray(finding.rss_items)
      ? finding.rss_items[0]
      : finding.rss_items;
    const queued = queuedByFindingId.get(String(finding.id));

    return {
      id: finding.id,
      title: rssItem?.title ?? "Untitled update",
      summary: finding.summary ?? rssItem?.summary ?? "No summary provided.",
      publishedAt: rssItem?.published_at
        ? new Date(rssItem.published_at).toISOString().split("T")[0]
        : "Unknown date",
      category: finding.category ?? rssItem?.category ?? "General",
      impact: finding.impact as EasaUpdate["impact"],
      confidence: finding.confidence,
      mappedSection: finding.mapped_section,
      status: finding.status as EasaUpdate["status"],
      queuedUpdateId: queued?.id ?? null,
      queuedDraftReady: queued?.draftReady ?? false,
    };
  });

  const latest = data[0]?.created_at
    ? new Date(data[0].created_at).toISOString()
    : new Date().toISOString();

  let deletedItems: EasaUpdate[] = [];
  const deletedQuery = supabase
    .from("ai_findings")
    .select(
      `
        id,
        impact,
        confidence,
        mapped_section,
        status,
        category,
        summary,
        organization_id,
        created_at,
        deleted_at,
        rss_items (
          title,
          summary,
          published_at,
          category,
          link
        )
      `,
    )
    .eq("organization_id", ctx.orgId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(50);

  const deletedResult = await deletedQuery;
  if (!deletedResult.error) {
    deletedItems = deletedResult.data.map((finding) => {
      const rssItem = Array.isArray(finding.rss_items)
        ? finding.rss_items[0]
        : finding.rss_items;

      return {
        id: finding.id,
        title: rssItem?.title ?? "Untitled update",
        summary: finding.summary ?? rssItem?.summary ?? "No summary provided.",
        publishedAt: rssItem?.published_at
          ? new Date(rssItem.published_at).toISOString().split("T")[0]
          : "Unknown date",
        category: finding.category ?? rssItem?.category ?? "General",
        impact: finding.impact as EasaUpdate["impact"],
        confidence: finding.confidence,
        mappedSection: finding.mapped_section,
        status: finding.status as EasaUpdate["status"],
        deletedAt: (finding.deleted_at as string | null) ?? null,
      };
    });
  }

  return buildCollation(items, latest, { deletedItems, source: "supabase", fallbackReason: null });
}
