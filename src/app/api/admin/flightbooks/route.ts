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

// GET /api/admin/flightbooks
export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase!
    .from("flightbooks")
    .select("id, name, doc_type, version_label, active, created_at")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ flightbooks: data ?? [] });
}

// POST /api/admin/flightbooks — create a new flightbook
export async function POST(request: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, docType, versionLabel } = (await request.json()) as {
    name?: string;
    docType?: string;
    versionLabel?: string;
  };
  if (!name || !docType) return NextResponse.json({ error: "name and docType required" }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin.from("flightbooks").insert({
    organization_id: ctx.orgId,
    name,
    doc_type: docType,
    version_label: versionLabel ?? null,
    active: true,
  }).select("id, name, doc_type, version_label, active, created_at").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, flightbook: data });
}

// PATCH /api/admin/flightbooks — update name/active/version_label
export async function PATCH(request: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, active, name, versionLabel } = (await request.json()) as {
    id?: string;
    active?: boolean;
    name?: string;
    versionLabel?: string;
  };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (active !== undefined) patch.active = active;
  if (name !== undefined) patch.name = name;
  if (versionLabel !== undefined) patch.version_label = versionLabel;

  const admin = getAdminClient();
  const { error } = await admin
    .from("flightbooks")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/flightbooks
export async function DELETE(request: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin
    .from("flightbooks")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
