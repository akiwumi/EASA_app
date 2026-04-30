import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type OrgAccessContext = {
  userId: string;
  orgId: string;
  role: string;
};

export function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
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

  if (!orgUser?.organization_id || !orgUser.role) return null;

  return {
    userId: user.id,
    orgId: orgUser.organization_id as string,
    role: orgUser.role as string,
  };
}

export async function getOrgAdminContext(): Promise<OrgAccessContext | null> {
  const ctx = await getOrgAccessContext();
  if (!ctx || ctx.role !== "admin") return null;
  return ctx;
}
