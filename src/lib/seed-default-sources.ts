import { getSupabaseAdminClient } from "@/lib/supabase/access";

export type SourceCategory =
  | "easy_access_rules"
  | "amcgm"
  | "regulation"
  | "agency_decisions"
  | "safety_publications"
  | "airworthiness_directives"
  | "sib"
  | "npa"
  | "news"
  | "press";

interface SeedSource {
  url: string;
  type: "rss" | "html";
  category: SourceCategory;
  label: string;
}

export const CATEGORY_META: Record<
  SourceCategory,
  { label: string; colour: string; description: string }
> = {
  easy_access_rules: {
    label: "Easy Access Rules",
    colour: "is-blue",
    description: "EASA consolidated regulatory texts — primary reference for ATOs",
  },
  amcgm: {
    label: "AMC/GM",
    colour: "is-purple",
    description: "Acceptable Means of Compliance and Guidance Material",
  },
  regulation: {
    label: "Regulation",
    colour: "is-orange",
    description: "Base EU regulations (e.g. EU 1178/2011)",
  },
  agency_decisions: {
    label: "Agency Decision",
    colour: "is-teal",
    description: "Formal EASA decisions adopting AMC/GM amendments",
  },
  safety_publications: {
    label: "Safety Publication",
    colour: "is-green",
    description: "Safety reviews, studies, and publications from the Safety Publications Tool",
  },
  airworthiness_directives: {
    label: "Airworthiness Directive",
    colour: "is-red",
    description: "Mandatory AD compliance — check applicability and compliance dates",
  },
  sib: {
    label: "Safety Information Bulletin",
    colour: "is-yellow",
    description: "Safety recommendations — no mandatory compliance date",
  },
  npa: {
    label: "NPA / Consultation",
    colour: "is-muted",
    description: "Notices of Proposed Amendment and open consultations",
  },
  news: {
    label: "EASA News",
    colour: "is-muted",
    description: "General EASA newsroom updates",
  },
  press: {
    label: "Press Release",
    colour: "is-muted",
    description: "Official EASA press releases",
  },
};

// Ordered by priority for a flight school compliance manager
const DEFAULT_SOURCES: SeedSource[] = [
  // ── Easy Access Rules (RSS + key HTML pages) ──────────────────────────────
  {
    url: "https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml",
    type: "rss",
    category: "easy_access_rules",
    label: "Easy Access Rules — new editions",
  },
  {
    url: "https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-flight-crew-licensing-regulation-eu-no-11782011",
    type: "html",
    category: "easy_access_rules",
    label: "EAR — Part-FCL (EU 1178/2011)",
  },
  {
    url: "https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-approved-training-organisations-part-ora",
    type: "html",
    category: "easy_access_rules",
    label: "EAR — Part-ORA (ATOs)",
  },
  {
    url: "https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-medical-requirements-part-med",
    type: "html",
    category: "easy_access_rules",
    label: "EAR — Part-MED (Medical)",
  },
  {
    url: "https://www.easa.europa.eu/en/document-library/easy-access-rules/online-publications/easy-access-rules-declared-training-organisations-dto",
    type: "html",
    category: "easy_access_rules",
    label: "EAR — Part-DTO",
  },

  // ── AMC/GM ────────────────────────────────────────────────────────────────
  {
    url: "https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/feed.xml",
    type: "rss",
    category: "amcgm",
    label: "AMC/GM — new amendments",
  },

  // ── Agency Decisions ──────────────────────────────────────────────────────
  {
    url: "https://www.easa.europa.eu/en/document-library/agency-decisions/feed.xml",
    type: "rss",
    category: "agency_decisions",
    label: "Agency Decisions",
  },

  // ── Airworthiness Directives ──────────────────────────────────────────────
  {
    url: "https://www.easa.europa.eu/en/document-library/airworthiness-directives/feed.xml",
    type: "rss",
    category: "airworthiness_directives",
    label: "Airworthiness Directives — new publications",
  },

  // ── Safety Information Bulletins ──────────────────────────────────────────
  {
    url: "https://www.easa.europa.eu/en/document-library/safety-information-bulletins/feed.xml",
    type: "rss",
    category: "sib",
    label: "Safety Information Bulletins",
  },

  // ── Safety Publications Tool ──────────────────────────────────────────────
  {
    url: "https://www.easa.europa.eu/en/document-library/safety-publications/feed.xml",
    type: "rss",
    category: "safety_publications",
    label: "Safety Publications Tool",
  },

  // ── NPA / Consultations ───────────────────────────────────────────────────
  {
    url: "https://www.easa.europa.eu/en/document-library/notices-of-proposed-amendment/feed.xml",
    type: "rss",
    category: "npa",
    label: "Notices of Proposed Amendment",
  },
  {
    url: "https://www.easa.europa.eu/en/document-library/opinions/feed.xml",
    type: "rss",
    category: "agency_decisions",
    label: "EASA Opinions",
  },

  // ── General news ──────────────────────────────────────────────────────────
  {
    url: "https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml",
    type: "rss",
    category: "news",
    label: "EASA News",
  },
  {
    url: "https://www.easa.europa.eu/en/newsroom-and-events/press-releases/feed.xml",
    type: "rss",
    category: "press",
    label: "Press Releases",
  },
];

const DEAD_FEEDS = [
  "https://www.easa.europa.eu/en/rss/news",
  "https://www.easa.europa.eu/en/rss/consultations",
  "https://www.easa.europa.eu/en/rss/publications",
  "https://example.com/feed.xml",
];

export async function seedDefaultSources(orgId: string) {
  const admin = getSupabaseAdminClient();

  await admin
    .from("organizations")
    .upsert({ id: orgId, name: "Demo Flight School" }, { onConflict: "id" });

  if (DEAD_FEEDS.length > 0) {
    await admin.from("sources").delete().in("url", DEAD_FEEDS);
  }

  const inserted: string[] = [];
  const skipped: string[] = [];

  for (const src of DEFAULT_SOURCES) {
    const { data: existing } = await admin
      .from("sources")
      .select("id")
      .eq("url", src.url)
      .maybeSingle();

    if (existing) {
      await admin
        .from("sources")
        .update({
          active: true,
          organization_id: null,
          category: src.category,
          label: src.label,
        })
        .eq("url", src.url);
      skipped.push(src.url);
    } else {
      const { error } = await admin.from("sources").insert({
        organization_id: null,
        url: src.url,
        type: src.type,
        active: true,
        category: src.category,
        label: src.label,
      });
      if (!error) inserted.push(src.url);
    }
  }

  return { inserted, skipped };
}
