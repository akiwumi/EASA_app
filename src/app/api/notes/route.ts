import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getAuthUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

async function getOrgId(userId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("org_users")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.organization_id as string | null) ?? null;
}

// GET /api/notes?updateId=<uuid>
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const updateId = searchParams.get("updateId");
  if (!updateId) {
    return NextResponse.json({ error: "updateId required" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("update_notes")
    .select("id, body, author_email, created_at")
    .eq("proposed_update_id", updateId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ notes: data ?? [] });
}

// POST /api/notes  body: { updateId, body }
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { updateId, body } = (await request.json()) as {
    updateId?: string;
    body?: string;
  };

  if (!updateId || !body?.trim()) {
    return NextResponse.json({ error: "updateId and body required" }, { status: 400 });
  }

  const orgId = await getOrgId(user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organisation found for user" }, { status: 403 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("update_notes")
    .insert({
      organization_id: orgId,
      proposed_update_id: updateId,
      author_id: user.id,
      author_email: user.email ?? null,
      body: body.trim(),
    })
    .select("id, body, author_email, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, note: data });
}
