import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { lessonId, studentUserId, instructorUserId, signoffNote } = (await request.json()) as {
    lessonId?: string | null;
    studentUserId?: string;
    instructorUserId?: string | null;
    signoffNote?: string | null;
  };

  if (!studentUserId) {
    return NextResponse.json({ error: "studentUserId is required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("training_signoffs")
    .insert({
      organization_id: ctx.orgId,
      lesson_id: lessonId || null,
      student_user_id: studentUserId,
      instructor_user_id: instructorUserId || null,
      signoff_note: signoffNote?.trim() || null,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ signoff: data });
}

export async function PATCH(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, signoffNote } = (await request.json()) as {
    id?: string;
    signoffNote?: string | null;
  };

  if (!id) return NextResponse.json({ error: "Sign-off id is required" }, { status: 400 });

  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin
    .from("training_signoffs")
    .select("instructor_user_id")
    .eq("organization_id", ctx.orgId)
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Sign-off not found" }, { status: 404 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (existing.instructor_user_id && existing.instructor_user_id !== ctx.userId && ctx.role !== "admin" && ctx.role !== "editor" && ctx.role !== "compliance_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("training_signoffs")
    .update({
      instructor_user_id: existing.instructor_user_id ?? ctx.userId,
      status: "completed",
      signoff_note: signoffNote?.trim() || null,
      signed_off_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
