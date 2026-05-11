import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;

  const allowed = ["mandatory", "recommended", "informational"];
  if (!body.compliance_category || !allowed.includes(body.compliance_category as string)) {
    return NextResponse.json({ error: "Invalid compliance_category" }, { status: 400 });
  }
  if (!body.title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("ad_sib_findings")
    .insert({
      organization_id: ctx.orgId,
      doc_type: body.doc_type ?? "ad",
      reference_number: body.reference_number ?? null,
      title: body.title,
      applicability: body.applicability ?? null,
      compliance_date: body.compliance_date ?? null,
      compliance_category: body.compliance_category,
      effective_date: body.effective_date ?? null,
      url: body.url ?? null,
      summary: body.summary ?? null,
      status: "open",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id });
}
