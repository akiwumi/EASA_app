import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/access";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("org_users")
    .select("organization_id, role, organizations(id, name, created_at)")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ memberships: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationId } = await request.json() as { organizationId?: string };
  if (!organizationId) return NextResponse.json({ error: "organizationId required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { data: membership, error } = await admin
    .from("org_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!membership) return NextResponse.json({ error: "Not a member of that school." }, { status: 403 });

  const jar = await cookies();
  jar.set("active_org_id", organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}