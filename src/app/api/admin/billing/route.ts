import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (error && error.code !== "PGRST116" && error.code !== "PGRST205" && error.code !== "42P01") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    stripeConfigured: false,
    trialDays: 0,
    subscription: data ?? null,
  });
}

export async function POST(request: Request) {
  await request.json().catch(() => null);
  return NextResponse.json({ error: "Stripe billing is disabled for school registration." }, { status: 400 });
}
