import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";

// GET /api/admin/sources
export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("sources")
    .select("id, url, type, active, created_at")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ sources: data ?? [] });
}

// POST /api/admin/sources — add a new feed URL
export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { url, type } = (await request.json()) as { url?: string; type?: string };
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Basic URL validation
  try { new URL(url); } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("sources")
    .insert({ organization_id: ctx.orgId, url, type: type ?? "rss", active: true })
    .select("id, url, type, active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ source: data });
}

// PATCH /api/admin/sources — toggle active
export async function PATCH(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, active } = (await request.json()) as { id?: string; active?: boolean };
  if (!id || active === undefined) return NextResponse.json({ error: "id and active required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("sources")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/sources
export async function DELETE(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("sources")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
