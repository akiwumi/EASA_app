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
    .select(`
      public_name,
      legal_name,
      logo_url,
      website_url,
      school_code,
      primary_color,
      secondary_color,
      contact_email,
      contact_phone,
      address_line1,
      address_line2,
      city,
      region,
      postal_code,
      country,
      billing_contact_name,
      billing_email,
      billing_phone,
      billing_address,
      vat_number,
      billing_notes
    `)
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
        legal_name: null,
        logo_url: null,
        website_url: null,
        school_code: null,
        primary_color: null,
        secondary_color: null,
        contact_email: null,
        contact_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        region: null,
        postal_code: null,
        country: null,
        billing_contact_name: null,
        billing_email: null,
        billing_phone: null,
        billing_address: null,
        vat_number: null,
        billing_notes: null,
      },
  });
}

export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    public_name?: string | null;
    legal_name?: string | null;
    logo_url?: string | null;
    website_url?: string | null;
    school_code?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
    country?: string | null;
    billing_contact_name?: string | null;
    billing_email?: string | null;
    billing_phone?: string | null;
    billing_address?: string | null;
    vat_number?: string | null;
    billing_notes?: string | null;
  };

  const admin = getSupabaseAdminClient();
  const payload = {
    organization_id: ctx.orgId,
    public_name: body.public_name?.trim() || null,
    legal_name: body.legal_name?.trim() || null,
    logo_url: body.logo_url?.trim() || null,
    website_url: body.website_url?.trim() || null,
    school_code: body.school_code?.trim() || null,
    primary_color: body.primary_color?.trim() || null,
    secondary_color: body.secondary_color?.trim() || null,
    contact_email: body.contact_email?.trim() || null,
    contact_phone: body.contact_phone?.trim() || null,
    address_line1: body.address_line1?.trim() || null,
    address_line2: body.address_line2?.trim() || null,
    city: body.city?.trim() || null,
    region: body.region?.trim() || null,
    postal_code: body.postal_code?.trim() || null,
    country: body.country?.trim() || null,
    billing_contact_name: body.billing_contact_name?.trim() || null,
    billing_email: body.billing_email?.trim() || null,
    billing_phone: body.billing_phone?.trim() || null,
    billing_address: body.billing_address?.trim() || null,
    vat_number: body.vat_number?.trim() || null,
    billing_notes: body.billing_notes?.trim() || null,
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
