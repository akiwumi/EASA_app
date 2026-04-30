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

  return NextResponse.json({
    config: data ?? { provider: "openai", model: "gpt-4o", api_key: null },
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

  const admin = getSupabaseAdminClient();

  const body = {
    provider,
    model,
    api_key: apiKey ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("ai_provider_config")
    .select("id")
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  const { error } = existing
    ? await admin.from("ai_provider_config").update(body).eq("organization_id", ctx.orgId)
    : await admin.from("ai_provider_config").insert({ ...body, organization_id: ctx.orgId });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
