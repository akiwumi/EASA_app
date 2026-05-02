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

  const org = (orgRow?.organizations ?? null) as { name?: string } | null;
  let brandName: string | null = null;
  let brandPrimaryColor: string | null = null;

  if (orgRow?.organization_id) {
    const brandingResult = await supabase
      .from("organization_branding")
      .select("public_name, primary_color")
      .eq("organization_id", String(orgRow.organization_id))
      .maybeSingle();

    if (!brandingResult.error) {
      brandName = (brandingResult.data?.public_name as string | null) ?? null;
      brandPrimaryColor = (brandingResult.data?.primary_color as string | null) ?? null;
    }
  }

  return (
    <AppShell
      organizationName={brandName ?? org?.name ?? ""}
      brandPrimaryColor={brandPrimaryColor}
      role={orgRow?.role ? String(orgRow.role) : "admin"}
    >
      {children}
    </AppShell>
  );
}
