import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { lessonId, flightbookId, flightbookSectionId, title, required } = (await request.json()) as {
    lessonId?: string;
    flightbookId?: string | null;
    flightbookSectionId?: string;
    title?: string | null;
    required?: boolean;
  };

  if (!lessonId || !flightbookSectionId) {
    return NextResponse.json({ error: "lessonId and flightbookSectionId are required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("lesson_documents")
    .insert({
      organization_id: ctx.orgId,
      lesson_id: lessonId,
      flightbook_id: flightbookId || null,
      flightbook_section_id: flightbookSectionId,
      title: title?.trim() || null,
      required: required !== false,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ lessonDocument: data });
}
