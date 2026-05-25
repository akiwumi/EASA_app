import { NextResponse } from "next/server";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";

type FilterBody = {
  id?: string;
  reg_part?: string | null;
  category?: string | null;
  filter_type?: "category" | "reg_part" | "source_id";
  filter_value?: string | null;
};

function cleanValue(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("org_finding_filters")
    .select("id, filter_type, filter_value, created_at")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as FilterBody;
  const explicitType = body.filter_type;
  const explicitValue = cleanValue(body.filter_value);
  const regPart = cleanValue(body.reg_part);
  const category = cleanValue(body.category);

  const filterType = explicitType ?? (regPart ? "reg_part" : category ? "category" : undefined);
  const filterValue = explicitValue ?? regPart ?? category;

  if (!filterType || !filterValue) {
    return NextResponse.json({ error: "filter_type and filter_value are required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("org_finding_filters")
    .insert({
      organization_id: ctx.orgId,
      filter_type: filterType,
      filter_value: filterValue,
      created_by: ctx.userId,
    })
    .select("id, filter_type, filter_value, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as FilterBody;
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("org_finding_filters")
    .delete()
    .eq("organization_id", ctx.orgId)
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
