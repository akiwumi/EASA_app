import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { lessonId, userId, title, dueAt } = (await request.json()) as {
    lessonId?: string | null;
    userId?: string;
    title?: string;
    dueAt?: string | null;
  };

  if (!userId || !title?.trim()) {
    return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  const lessonProgrammeId =
    lessonId
      ? (
          await admin
            .from("training_lessons")
            .select("programme_id")
            .eq("organization_id", ctx.orgId)
            .eq("id", lessonId)
            .maybeSingle()
        ).data?.programme_id ?? null
      : null;

  const { data: assignment, error } = await admin
    .from("document_assignments")
    .insert({
      organization_id: ctx.orgId,
      lesson_id: lessonId || null,
      programme_id: lessonProgrammeId,
      user_id: userId,
      assigned_by: ctx.userId,
      title: title.trim(),
      due_at: dueAt || null,
      status: "assigned",
    })
    .select("id, user_id")
    .maybeSingle();

  if (error || !assignment) {
    return NextResponse.json({ error: error?.message ?? "Failed to create assignment" }, { status: 400 });
  }

  await admin.from("acknowledgements").upsert(
    {
      organization_id: ctx.orgId,
      assignment_id: assignment.id,
      user_id: assignment.user_id,
      status: "pending",
    },
    { onConflict: "assignment_id,user_id" },
  );

  return NextResponse.json({ assignment });
}
