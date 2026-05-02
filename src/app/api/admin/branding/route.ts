import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";

function isMissingSchemaError(error: { code?: string | null; message?: string | null } | null | undefined) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    /could not find the table/i.test(error?.message ?? "") ||
    /relation .* does not exist/i.test(error?.message ?? "")
  );
}

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("organization_branding")
    .select("public_name, logo_url, primary_color, secondary_color, contact_email, contact_phone")
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (error && isMissingSchemaError(error)) {
    return NextResponse.json({
      schemaReady: false,
      branding: null,
    });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    schemaReady: true,
    branding: data ?? {
      public_name: null,
      logo_url: null,
      primary_color: null,
      secondary_color: null,
      contact_email: null,
      contact_phone: null,
    },
  });
}

export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    public_name?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
  };

  const admin = getSupabaseAdminClient();
  const payload = {
    organization_id: ctx.orgId,
    public_name: body.public_name?.trim() || null,
    logo_url: body.logo_url?.trim() || null,
    primary_color: body.primary_color?.trim() || null,
    secondary_color: body.secondary_color?.trim() || null,
    contact_email: body.contact_email?.trim() || null,
    contact_phone: body.contact_phone?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("organization_branding")
    .upsert(payload, { onConflict: "organization_id" });

  if (error && isMissingSchemaError(error)) {
    return NextResponse.json(
      { error: "Branding settings will save after the Phase 3 migrations are applied." },
      { status: 400 },
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
