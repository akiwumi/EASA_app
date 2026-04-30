import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

// GET /api/admin/flightbooks
export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase!
    .from("flightbooks")
    .select("id, name, doc_type, version_label, active, created_at")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (error && isMissingSchemaError(error)) {
    return NextResponse.json({ flightbooks: [], missingSchema: true });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ flightbooks: data ?? [] });
}

// POST /api/admin/flightbooks — create a new flightbook
export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, docType, versionLabel } = (await request.json()) as {
    name?: string;
    docType?: string;
    versionLabel?: string;
  };
  if (!name || !docType) return NextResponse.json({ error: "name and docType required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
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
  const ctx = await getOrgAdminContext();
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

  const admin = getSupabaseAdminClient();
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
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("flightbooks")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
