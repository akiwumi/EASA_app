import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { aircraft, manualGroup, effectiveDate, importNotes, tags } = (await request.json()) as {
    aircraft?: string | null;
    manualGroup?: string | null;
    effectiveDate?: string | null;
    importNotes?: string | null;
    tags?: string[];
  };

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("flightbooks")
    .update({
      aircraft: aircraft ?? null,
      manual_group: manualGroup ?? null,
      effective_date: effectiveDate ?? null,
      import_notes: importNotes ?? null,
      tags: Array.isArray(tags) ? tags : [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
