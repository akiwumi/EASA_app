import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId, body } = (await request.json()) as {
    sectionId?: string;
    body?: string;
  };

  if (!sectionId || !body?.trim()) {
    return NextResponse.json({ error: "sectionId and body are required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("flightbook_section_comments").insert({
    organization_id: ctx.orgId,
    flightbook_section_id: sectionId,
    author_id: ctx.userId,
    body: body.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
