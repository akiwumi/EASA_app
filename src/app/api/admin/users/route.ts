import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import type { CurrentOrgRole } from "@/lib/types/domain";

function toOrgRole(role?: string): CurrentOrgRole {
  if (role === "admin" || role === "instructor" || role === "student" || role === "viewer") {
    return role;
  }
  return "student";
}

// GET /api/admin/users — list all users in the org
export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await getSupabaseServerClient();
  const { data: orgUsers } = await supabase!
    .from("org_users")
    .select("user_id, role, created_at")
    .eq("organization_id", ctx.orgId);

  if (!orgUsers?.length) return NextResponse.json({ users: [] });

  const { data: profiles } = await supabase!
    .from("user_profiles")
    .select("id, display_name, avatar_url, personal_notes, phone")
    .in("id", orgUsers.map((u) => u.user_id));

  const admin = getSupabaseAdminClient();
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authMap = new Map(
    (authList?.users ?? []).map((u) => [
      u.id,
      {
        email: u.email,
        lastSignIn: u.last_sign_in_at,
        emailConfirmedAt: u.email_confirmed_at,
      },
    ])
  );
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users = orgUsers.map((ou) => ({
    userId: ou.user_id,
    role: ou.role,
    joinedAt: ou.created_at,
    email: authMap.get(ou.user_id)?.email ?? null,
    lastSignIn: authMap.get(ou.user_id)?.lastSignIn ?? null,
    emailConfirmedAt: authMap.get(ou.user_id)?.emailConfirmedAt ?? null,
    displayName: profileMap.get(ou.user_id)?.display_name ?? null,
    avatarUrl: profileMap.get(ou.user_id)?.avatar_url ?? null,
    personalNotes: profileMap.get(ou.user_id)?.personal_notes ?? null,
    phone: profileMap.get(ou.user_id)?.phone ?? null,
  }));

  return NextResponse.json({ users });
}

// POST /api/admin/users — invite a new user and add to org
export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, role } = (await request.json()) as { email?: string; role?: string };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const validRole = toOrgRole(role);
  const admin = getSupabaseAdminClient();

  const redirectTo = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : undefined;
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      organization_id: ctx.orgId,
      app_role: validRole,
    },
  });
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
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role } = (await request.json()) as { userId?: string; role?: string };
  if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });

  const validRole = toOrgRole(role);
  const admin = getSupabaseAdminClient();

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
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = (await request.json()) as { userId?: string };
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (userId === ctx.userId) {
    return NextResponse.json({ error: "Admins cannot delete their own account from this screen." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { data: memberships, error: membershipError } = await admin
    .from("org_users")
    .select("organization_id")
    .eq("user_id", userId);

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  if ((memberships?.length ?? 0) > 1) {
    const { error } = await admin
      .from("org_users")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", ctx.orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, deletedAccount: false });
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
