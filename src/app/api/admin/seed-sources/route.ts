import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

const DEFAULT_FEEDS = [
  "https://www.easa.europa.eu/en/rss/news",
  "https://www.easa.europa.eu/en/rss/consultations",
  "https://www.easa.europa.eu/en/rss/publications",
];

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// POST /api/admin/seed-sources — ensure default org and EASA feeds exist
export async function POST() {
  const admin = getAdminClient();

  // Ensure default org exists
  await admin.from("organizations").upsert(
    { id: DEFAULT_ORG_ID, name: "Demo Flight School" },
    { onConflict: "id" },
  );

  // Insert default EASA feeds if missing
  const inserted: string[] = [];
  const skipped: string[] = [];

  for (const url of DEFAULT_FEEDS) {
    const { data: existing } = await admin
      .from("sources")
      .select("id")
      .eq("url", url)
      .maybeSingle();

    if (existing) {
      // Make sure it's active
      await admin.from("sources").update({ active: true }).eq("url", url);
      skipped.push(url);
    } else {
      const { error } = await admin.from("sources").insert({
        organization_id: DEFAULT_ORG_ID,
        url,
        type: "rss",
        active: true,
      });
      if (!error) inserted.push(url);
    }
  }

  return NextResponse.json({ ok: true, inserted, activated: skipped });
}
