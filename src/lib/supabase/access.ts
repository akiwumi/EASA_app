import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type OrgAccessContext = {
  userId: string;
  orgId: string;
  role: string;
};

export const ORG_ADMIN_ROLES = ["admin"] as const;
export const ORG_APPROVER_ROLES = ["admin", "editor", "compliance_manager"] as const;
export const ORG_ROLLBACK_ROLES = ["admin", "compliance_manager"] as const;

export const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";
export const DEFAULT_ORG_NAME = "Demo Flight School";

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureDefaultOrgMembership(userId: string): Promise<OrgAccessContext | null> {
  const admin = getSupabaseAdminClient();

  const { error: orgError } = await admin.from("organizations").upsert(
    { id: DEFAULT_ORG_ID, name: DEFAULT_ORG_NAME },
    { onConflict: "id" },
  );

  if (orgError) return null;

  const { data: existingMembership, error: existingMembershipError } = await admin
    .from("org_users")
    .select("organization_id, role")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMembershipError) {
    return null;
  }

  const membership = existingMembership ?? (
    await admin
      .from("org_users")
      .insert({
        organization_id: DEFAULT_ORG_ID,
        user_id: userId,
        role: "admin",
      })
      .select("organization_id, role")
      .maybeSingle()
  ).data;

  if (!membership?.organization_id || !membership?.role) return null;

  return {
    userId,
    orgId: membership.organization_id as string,
    role: membership.role as string,
  };
}

export async function getOrgAccessContext(): Promise<OrgAccessContext | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = getSupabaseAdminClient();
  const { data: orgUser } = await admin
    .from("org_users")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!orgUser?.organization_id || !orgUser.role) {
    return ensureDefaultOrgMembership(user.id);
  }

  return {
    userId: user.id,
    orgId: orgUser.organization_id as string,
    role: orgUser.role as string,
  };
}

export async function getOrgAdminContext(): Promise<OrgAccessContext | null> {
  return getOrgScopedContext(ORG_ADMIN_ROLES);
}

export async function getOrgScopedContext(
  allowedRoles: readonly string[],
): Promise<OrgAccessContext | null> {
  const ctx = await getOrgAccessContext();
  if (!ctx || !allowedRoles.includes(ctx.role)) return null;
  return ctx;
}
