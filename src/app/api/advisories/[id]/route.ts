import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json() as { status?: string };
  const { status } = body;

  const allowed = ["open", "closed", "superseded"];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ad_sib_findings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
