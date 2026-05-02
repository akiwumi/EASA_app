import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { programmeId, title, description } = (await request.json()) as {
    programmeId?: string;
    title?: string;
    description?: string | null;
  };

  if (!programmeId || !title?.trim()) {
    return NextResponse.json({ error: "programmeId and title are required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { count } = await admin
    .from("training_phases")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.orgId)
    .eq("programme_id", programmeId);

  const { data, error } = await admin
    .from("training_phases")
    .insert({
      organization_id: ctx.orgId,
      programme_id: programmeId,
      title: title.trim(),
      description: description?.trim() || null,
      sort_order: Number(count ?? 0),
    })
    .select("id, title")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ phase: data });
}
