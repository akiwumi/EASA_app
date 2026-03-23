import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

async function getAdminContext() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getAdminClient();
  const { data: orgUser } = await admin
    .from("org_users")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (orgUser && orgUser.role !== "admin") return null;
  return { orgId: (orgUser?.organization_id ?? DEFAULT_ORG_ID) as string };
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/admin/ai-settings
export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getAdminClient();
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
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { provider, model, apiKey } = (await request.json()) as {
    provider?: string;
    model?: string;
    apiKey?: string;
  };
  if (!provider || !model) return NextResponse.json({ error: "provider and model required" }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin.from("ai_provider_config").upsert({
    organization_id: ctx.orgId,
    provider,
    model,
    api_key: apiKey ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
