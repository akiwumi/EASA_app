import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("training_form_submissions")
    .select(
      "id, submitted_by, student_user_id, status, submitted_at, created_at, payload, lesson_id",
    )
    .eq("organization_id", ctx.orgId)
    .eq("form_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const submissions = data ?? [];

  const userIds = [
    ...new Set(
      submissions.flatMap((s) => [s.submitted_by, s.student_user_id].filter(Boolean) as string[]),
    ),
  ];

  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("id, display_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap[p.id as string] = (p.display_name as string | null) ?? "";
    }
  }

  return NextResponse.json({
    submissions: submissions.map((s) => ({
      ...s,
      submittedByName: profileMap[s.submitted_by as string] ?? null,
      studentName: profileMap[s.student_user_id as string] ?? null,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { payload, lessonId, studentUserId } = (await request.json()) as {
    payload?: Record<string, unknown>;
    lessonId?: string | null;
    studentUserId?: string | null;
  };

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("training_form_submissions")
    .insert({
      organization_id: ctx.orgId,
      form_id: id,
      submitted_by: ctx.userId,
      student_user_id: studentUserId || ctx.userId,
      lesson_id: lessonId || null,
      payload: payload ?? {},
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to submit" },
      { status: 400 },
    );
  }

  return NextResponse.json({ submission: data });
}
