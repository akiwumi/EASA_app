import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/supabase/profile";
import AppShell from "@/components/navigation/AppShell";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await ensureUserProfile(supabase, user);
  } catch {
    // user_profiles table may not exist until migrations are applied
  }

  const { data: orgRow } = await supabase
    .from("org_users")
    .select("organization_id, role, organizations ( name )")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!orgRow?.organization_id) {
    return (
      <div className="easa-app flex min-h-screen items-center justify-center p-8">
        <div className="easa-card max-w-md p-8 text-center">
          <h1 className="text-lg font-semibold">No organisation</h1>
          <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
            Your account is not linked to an organisation. Ask an administrator to
            add you in Supabase <code className="text-xs">org_users</code>.
          </p>
        </div>
      </div>
    );
  }

  const org = orgRow.organizations as { name?: string } | null;

  return (
    <AppShell
      organizationName={org?.name ?? "Organisation"}
      role={String(orgRow.role)}
    >
      {children}
    </AppShell>
  );
}
