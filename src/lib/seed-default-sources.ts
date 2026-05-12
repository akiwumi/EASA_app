import { getSupabaseAdminClient } from "@/lib/supabase/access";

export const DEFAULT_FEEDS = [
  // Priority 1 — Easy Access Rules (consolidated rulebook updates)
  "https://www.easa.europa.eu/document-library/easy-access-rules/feed.xml",
  // Priority 2 — Regulations (underlying regulation changes)
  "https://www.easa.europa.eu/document-library/regulations/feed.xml",
  // Priority 3 — AMC & GM (compliance demonstration guidance)
  "https://www.easa.europa.eu/document-library/acceptable-means-of-compliance-and-guidance-materials/feed.xml",
  // Priority 4 — Agency Decisions (issue/amend AMC, GM, certification specs)
  "https://www.easa.europa.eu/document-library/agency-decisions/feed.xml",
  // Priority 7 — News (secondary signal for major rule announcements)
  "https://www.easa.europa.eu/newsroom-and-events/news/feed.xml",
  // Priority 8 — Press Releases (high-level awareness)
  "https://www.easa.europa.eu/newsroom-and-events/press-releases/feed.xml",
  // Priority 9 — Opinions (upcoming regulatory changes before final)
  "https://www.easa.europa.eu/document-library/opinions/feed.xml",
  // Priority 10 — NPAs (predict future compliance changes)
  "https://www.easa.europa.eu/document-library/notices-of-proposed-amendment/feed.xml",
];

export const DEAD_FEEDS = [
  // Legacy /en/ variants replaced by canonical URLs above
  "https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml",
  "https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml",
  "https://www.easa.europa.eu/en/newsroom-and-events/press-releases/feed.xml",
  "https://www.easa.europa.eu/en/document-library/notices-of-proposed-amendment/feed.xml",
  "https://www.easa.europa.eu/en/document-library/opinions/feed.xml",
  "https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/feed.xml",
  // Previously dead feeds
  "https://www.easa.europa.eu/en/rss/news",
  "https://www.easa.europa.eu/en/rss/consultations",
  "https://www.easa.europa.eu/en/rss/publications",
  "https://example.com/feed.xml",
];

export async function seedDefaultSources() {
  const admin = getSupabaseAdminClient();

  if (DEAD_FEEDS.length > 0) {
    await admin.from("sources").delete().in("url", DEAD_FEEDS);
  }

  const inserted: string[] = [];
  const skipped: string[] = [];

  for (const url of DEFAULT_FEEDS) {
    const { data: existing } = await admin
      .from("sources")
      .select("id")
      .eq("url", url)
      .maybeSingle();

    if (existing) {
      await admin
        .from("sources")
        .update({ active: true, organization_id: null })
        .eq("url", url);
      skipped.push(url);
    } else {
      const { error } = await admin.from("sources").insert({
        organization_id: null,
        url,
        type: "rss",
        active: true,
      });
      if (!error) inserted.push(url);
    }
  }

  return { inserted, skipped };
}

export async function ensureDefaultAiConfig(organizationId: string) {
  const admin = getSupabaseAdminClient();
  await admin.from("ai_provider_config").upsert(
    {
      organization_id: organizationId,
      provider: "openai",
      model: "gpt-4o",
      api_key: "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id", ignoreDuplicates: true },
  );
}

export async function ensureDefaultSchedule(organizationId: string) {
  const admin = getSupabaseAdminClient();
  await admin.from("schedules").upsert(
    {
      organization_id: organizationId,
      cadence: "daily",
      run_time_utc: "06:00",
      run_times_utc: ["06:00:00"],
      runs_per_day: 1,
      enabled: true,
      auto_approve_low: false,
      auto_approve_delay_hours: 24,
      notify_on_detect: true,
      default_export_fmt: "pdf",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id", ignoreDuplicates: true },
  );
}

export async function ensureOrganizationPipelineDefaults(organizationId: string) {
  const [sources, aiConfig, schedule] = await Promise.allSettled([
    seedDefaultSources(),
    ensureDefaultAiConfig(organizationId),
    ensureDefaultSchedule(organizationId),
  ]);

  const rejected = [sources, aiConfig, schedule].find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (rejected) {
    throw rejected.reason instanceof Error
      ? rejected.reason
      : new Error("Unable to create organization pipeline defaults.");
  }
}
