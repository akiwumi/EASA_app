import { createClient } from "@supabase/supabase-js";

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
  byCategory: Record<string, number>;
  byImpact: Record<string, number>;
};

function buildCollation(items: EasaUpdate[], updatedAt: string): CollatedUpdates {
  const byCategory: Record<string, number> = {};
  const byImpact: Record<string, number> = {};

  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    byImpact[item.impact] = (byImpact[item.impact] ?? 0) + 1;
  }

  return {
    updatedAt,
    items,
    byCategory,
    byImpact,
  };
}

export async function fetchAiScrapedUpdates(): Promise<CollatedUpdates> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return buildCollation(MOCK_UPDATES, "2026-01-24 06:26 UTC");
  }

  const supabase = getAdminClient();

  const { data, error } = await supabase
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

  if (error || !data) {
    return buildCollation([], error?.message ?? "No results available");
  }

  const items: EasaUpdate[] = data.map((finding) => {
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
    };
  });

  const latest = data[0]?.created_at
    ? new Date(data[0].created_at).toISOString()
    : new Date().toISOString();

  return buildCollation(items, latest);
}
