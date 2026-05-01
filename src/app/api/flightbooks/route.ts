import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function GET() {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("flightbooks")
    .select("id, name")
    .eq("organization_id", ctx.orgId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ flightbooks: data ?? [] });
}
