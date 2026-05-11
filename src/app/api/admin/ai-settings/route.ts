import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";

// GET /api/admin/ai-settings
export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("ai_provider_config")
    .select("provider, model, api_key")
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  const config = data ?? { provider: "openai", model: "gpt-4o", api_key: "" };
  // Never return the api_key value to the client — only indicate whether a custom key is active
  return NextResponse.json({
    config: { provider: config.provider, model: config.model },
    usingAppDefault: !config.api_key,
  });
}

// POST /api/admin/ai-settings — upsert config
export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { provider, model, apiKey } = (await request.json()) as {
    provider?: string;
    model?: string;
    apiKey?: string;
  };
  if (!provider || !model) return NextResponse.json({ error: "provider and model required" }, { status: 400 });

  // Don't save the masked placeholder back to the database
  const keyToSave = apiKey && apiKey !== "••••••••" ? apiKey : "";

  const admin = getSupabaseAdminClient();

  // If user is keeping app default key, preserve existing key in DB
  if (keyToSave === null) {
    const { data: existing } = await admin
      .from("ai_provider_config")
      .select("api_key")
      .eq("organization_id", ctx.orgId)
      .maybeSingle();
    const preservedKey = (existing as { api_key?: string | null } | null)?.api_key ?? "";

    const { error } = await admin
      .from("ai_provider_config")
      .upsert(
        { organization_id: ctx.orgId, provider, model, api_key: preservedKey, updated_at: new Date().toISOString() },
        { onConflict: "organization_id" },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin
    .from("ai_provider_config")
    .upsert(
      { organization_id: ctx.orgId, provider, model, api_key: keyToSave, updated_at: new Date().toISOString() },
      { onConflict: "organization_id" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/ai-settings — revert to app default key
export async function DELETE() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ai_provider_config")
    .update({ api_key: "", updated_at: new Date().toISOString() })
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
