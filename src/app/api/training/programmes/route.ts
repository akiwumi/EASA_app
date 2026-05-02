import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, code, description } = (await request.json()) as {
    name?: string;
    code?: string | null;
    description?: string | null;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Programme name is required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("training_programmes")
    .insert({
      organization_id: ctx.orgId,
      name: name.trim(),
      code: code?.trim() || null,
      description: description?.trim() || null,
      created_by: ctx.userId,
    })
    .select("id, name")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ programme: data });
}
