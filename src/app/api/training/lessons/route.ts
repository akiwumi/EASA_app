import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { programmeId, phaseId, title, lessonCode, lessonType, description } = (await request.json()) as {
    programmeId?: string;
    phaseId?: string | null;
    title?: string;
    lessonCode?: string | null;
    lessonType?: string | null;
    description?: string | null;
  };

  if (!programmeId || !title?.trim()) {
    return NextResponse.json({ error: "programmeId and title are required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const query = admin
    .from("training_lessons")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.orgId)
    .eq("programme_id", programmeId);

  const { count } = phaseId ? await query.eq("phase_id", phaseId) : await query.is("phase_id", null);

  const { data, error } = await admin
    .from("training_lessons")
    .insert({
      organization_id: ctx.orgId,
      programme_id: programmeId,
      phase_id: phaseId || null,
      title: title.trim(),
      lesson_code: lessonCode?.trim() || null,
      lesson_type: lessonType?.trim() || "ground",
      description: description?.trim() || null,
      sort_order: Number(count ?? 0),
    })
    .select("id, title")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ lesson: data });
}
