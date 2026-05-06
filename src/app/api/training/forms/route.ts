import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function GET() {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("training_forms")
    .select(`
      id, title, description, active, created_at, programme_id,
      training_programmes ( name, code )
    `)
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const ids = (data ?? []).map((f) => f.id as string);
  let submissionCounts: Record<string, number> = {};

  if (ids.length > 0) {
    const { data: counts } = await admin
      .from("training_form_submissions")
      .select("form_id")
      .eq("organization_id", ctx.orgId)
      .in("form_id", ids);

    for (const row of counts ?? []) {
      const fid = row.form_id as string;
      submissionCounts[fid] = (submissionCounts[fid] ?? 0) + 1;
    }
  }

  const forms = (data ?? []).map((f) => {
    const prog = Array.isArray(f.training_programmes)
      ? f.training_programmes[0]
      : f.training_programmes;
    return {
      id: f.id,
      title: f.title,
      description: f.description,
      active: f.active,
      createdAt: f.created_at,
      programmeId: f.programme_id,
      programmeName: (prog as { name?: string } | null)?.name ?? null,
      submissionCount: submissionCounts[f.id as string] ?? 0,
    };
  });

  return NextResponse.json({ forms });
}

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "viewer" || ctx.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, description, programmeId, schemaJson } = (await request.json()) as {
    title?: string;
    description?: string;
    programmeId?: string | null;
    schemaJson?: Record<string, unknown>;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("training_forms")
    .insert({
      organization_id: ctx.orgId,
      title: title.trim(),
      description: description?.trim() || null,
      programme_id: programmeId || null,
      schema_json: schemaJson ?? { fields: [] },
      active: true,
    })
    .select("id, title")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create form" }, { status: 400 });
  }

  return NextResponse.json({ form: data });
}
