import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function PATCH(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, acknowledgementNote } = (await request.json()) as {
    id?: string;
    acknowledgementNote?: string | null;
  };

  if (!id) return NextResponse.json({ error: "Acknowledgement id is required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("acknowledgements")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledgement_note: acknowledgementNote?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
