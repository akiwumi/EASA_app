import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function getAdminContext() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!orgUser?.organization_id || orgUser.role !== "admin") return null;
  return { orgId: orgUser.organization_id as string };
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET /api/admin/users — list all users in the org
export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await getSupabaseServerClient();
  const { data: orgUsers } = await supabase!
    .from("org_users")
    .select("user_id, role, created_at")
    .eq("organization_id", ctx.orgId);

  if (!orgUsers?.length) return NextResponse.json({ users: [] });

  const { data: profiles } = await supabase!
    .from("user_profiles")
    .select("id, display_name")
    .in("id", orgUsers.map((u) => u.user_id));

  const admin = getAdminClient();
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authMap = new Map(
    (authList?.users ?? []).map((u) => [u.id, { email: u.email, lastSignIn: u.last_sign_in_at }])
  );
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  const users = orgUsers.map((ou) => ({
    userId: ou.user_id,
    role: ou.role,
    joinedAt: ou.created_at,
    email: authMap.get(ou.user_id)?.email ?? null,
    lastSignIn: authMap.get(ou.user_id)?.lastSignIn ?? null,
    displayName: profileMap.get(ou.user_id) ?? null,
  }));

  return NextResponse.json({ users });
}

// POST /api/admin/users — invite a new user and add to org
export async function POST(request: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, role } = (await request.json()) as { email?: string; role?: string };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const validRole = role === "admin" ? "admin" : "viewer";
  const admin = getAdminClient();

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });

  const userId = invited.user.id;

  // upsert in case the user was already in a different org or invited before
  const { error: ouErr } = await admin.from("org_users").upsert({
    user_id: userId,
    organization_id: ctx.orgId,
    role: validRole,
  });

  if (ouErr) return NextResponse.json({ error: ouErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, userId });
}

// PATCH /api/admin/users — change a user's role
export async function PATCH(request: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role } = (await request.json()) as { userId?: string; role?: string };
  if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });

  const validRole = role === "admin" ? "admin" : "viewer";
  const admin = getAdminClient();

  const { error } = await admin
    .from("org_users")
    .update({ role: validRole })
    .eq("user_id", userId)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users — remove a user from the org
export async function DELETE(request: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = (await request.json()) as { userId?: string };
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin
    .from("org_users")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
