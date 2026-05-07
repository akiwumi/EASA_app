import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import { resolveIncludedExtraUserLimit } from "@/lib/billing/subscription";
import type { CurrentOrgRole } from "@/lib/types/domain";

function toOrgRole(role?: string): CurrentOrgRole {
  if (
    role === "admin" ||
    role === "instructor" ||
    role === "student" ||
    role === "viewer" ||
    role === "editor" ||
    role === "compliance_manager"
  ) {
    return role;
  }
  return "viewer";
}

async function loadSeatSummary(admin: ReturnType<typeof getSupabaseAdminClient>, orgId: string) {
  const [{ data: subscription, error: subscriptionError }, { count: extraUsersUsed, error: countError }] = await Promise.all([
    admin
      .from("organization_subscriptions")
      .select("billing_state, stripe_price_id, subscription_status")
      .eq("organization_id", orgId)
      .maybeSingle(),
    admin
      .from("org_users")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .neq("role", "admin"),
  ]);

  if (subscriptionError && !["PGRST116", "PGRST205", "42P01"].includes(subscriptionError.code ?? "")) {
    throw new Error(subscriptionError.message);
  }

  if (countError) {
    throw new Error(countError.message);
  }

  const extraUserLimit = await resolveIncludedExtraUserLimit(subscription ?? null);
  const used = Number(extraUsersUsed ?? 0);

  return {
    extraUserLimit,
    extraUsersUsed: used,
    extraUsersRemaining: Math.max(extraUserLimit - used, 0),
    isOverLimit: used > extraUserLimit,
    canAddExtraUsers: used < extraUserLimit,
    billingState: subscription?.billing_state ?? "inactive",
  };
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

  const limits = await loadSeatSummary(admin, ctx.orgId);

  return NextResponse.json({ users, limits });
}

// POST /api/admin/users — invite a new user and add to org
export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, role, mode, displayName, password } = (await request.json()) as {
    email?: string;
    role?: string;
    mode?: "invite" | "create";
    displayName?: string;
    password?: string;
  };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const validRole = toOrgRole(role);
  const admin = getSupabaseAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedDisplayName = displayName?.trim() || null;

  if (validRole !== "admin") {
    const limits = await loadSeatSummary(admin, ctx.orgId);
    if (!limits.canAddExtraUsers) {
      return NextResponse.json(
        {
          error: `This subscription allows ${limits.extraUserLimit} extra user account${limits.extraUserLimit === 1 ? "" : "s"}. Remove an existing non-admin account or upgrade the plan first.`,
        },
        { status: 400 },
      );
    }
  }

  if (mode === "create") {
    if (validRole !== "student") {
      return NextResponse.json({ error: "Direct account creation is only enabled for student accounts." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Student password must be at least 8 characters long." }, { status: 400 });
    }

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: normalizedDisplayName,
        organization_id: ctx.orgId,
        app_role: validRole,
      },
    });

    if (createUserError || !createdUser.user) {
      return NextResponse.json(
        { error: createUserError?.message ?? "Unable to create student account." },
        { status: 400 },
      );
    }

    const userId = createdUser.user.id;
    const { error: ouErr } = await admin.from("org_users").upsert({
      user_id: userId,
      organization_id: ctx.orgId,
      role: validRole,
    });

    if (ouErr) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: ouErr.message }, { status: 400 });
    }

    if (normalizedDisplayName) {
      const { error: profileError } = await admin.from("user_profiles").upsert({
        id: userId,
        display_name: normalizedDisplayName,
      });

      if (profileError) {
        await admin.from("org_users").delete().eq("user_id", userId).eq("organization_id", ctx.orgId);
        await admin.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, userId, mode: "create" });
  }

  const redirectTo = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : undefined;
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo,
    data: {
      display_name: normalizedDisplayName,
      organization_id: ctx.orgId,
      app_role: validRole,
    },
  });
  if (inviteErr || !invited.user) {
    return NextResponse.json({ error: inviteErr?.message ?? "Unable to send invite." }, { status: 400 });
  }

  const userId = invited.user.id;

  const { error: ouErr } = await admin.from("org_users").upsert({
    user_id: userId,
    organization_id: ctx.orgId,
    role: validRole,
  });

  if (ouErr) return NextResponse.json({ error: ouErr.message }, { status: 400 });

  if (normalizedDisplayName) {
    await admin.from("user_profiles").upsert({
      id: userId,
      display_name: normalizedDisplayName,
    });
  }

  return NextResponse.json({ ok: true, userId, mode: "invite" });
}

// PATCH /api/admin/users — change a user's role
export async function PATCH(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role } = (await request.json()) as { userId?: string; role?: string };
  if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });

  const validRole = toOrgRole(role);
  const admin = getSupabaseAdminClient();
  const { data: membership, error: membershipError } = await admin
    .from("org_users")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  if (!membership) {
    return NextResponse.json({ error: "User membership not found." }, { status: 404 });
  }

  if (membership.role === "admin" && validRole !== "admin") {
    const limits = await loadSeatSummary(admin, ctx.orgId);
    if (!limits.canAddExtraUsers) {
      return NextResponse.json(
        {
          error: `This subscription already uses all ${limits.extraUserLimit} extra user account${limits.extraUserLimit === 1 ? "" : "s"}.`,
        },
        { status: 400 },
      );
    }
  }

  const { error } = await admin
    .from("org_users")
    .update({ role: validRole })
    .eq("user_id", userId)
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: authUserResult, error: authUserError } = await admin.auth.admin.getUserById(userId);
  if (authUserError) {
    return NextResponse.json({ error: authUserError.message }, { status: 400 });
  }

  const existingUserMetadata =
    authUserResult.user.user_metadata && typeof authUserResult.user.user_metadata === "object"
      ? authUserResult.user.user_metadata
      : {};

  const { error: updateUserError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingUserMetadata,
      organization_id: ctx.orgId,
      app_role: validRole,
    },
  });

  if (updateUserError) {
    return NextResponse.json({ error: updateUserError.message }, { status: 400 });
  }

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
