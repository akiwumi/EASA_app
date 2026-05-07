import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/supabase/profile";
import AppShell from "@/components/navigation/AppShell";
import type { OrganizationBranding } from "@/lib/types/domain";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

type OrganizationBrandingShellData = Pick<
  OrganizationBranding,
  "public_name" | "logo_url" | "website_url" | "contact_email" | "contact_phone" | "primary_color" | "secondary_color"
>;

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

  const ctx = await getOrgAccessContext();
  if (!ctx) {
    redirect("/login");
  }

  const admin = getSupabaseAdminClient();
  const { data: orgRow } = await admin
    .from("organizations")
    .select("name")
    .eq("id", ctx.orgId)
    .maybeSingle();

  let branding: OrganizationBrandingShellData | null = null;

  if (ctx.orgId) {
    const brandingResult = await admin
      .from("organization_branding")
      .select("public_name, logo_url, website_url, contact_email, contact_phone, primary_color, secondary_color")
      .eq("organization_id", ctx.orgId)
      .maybeSingle();

    if (!brandingResult.error) {
      branding = (brandingResult.data as OrganizationBrandingShellData | null) ?? null;
    }
  }

  return (
    <AppShell
      organizationName={branding?.public_name ?? (orgRow?.name as string | undefined) ?? ""}
      logoUrl={branding?.logo_url ?? null}
      websiteUrl={branding?.website_url ?? null}
      contactEmail={branding?.contact_email ?? null}
      contactPhone={branding?.contact_phone ?? null}
      brandPrimaryColor={branding?.primary_color ?? null}
      brandSecondaryColor={branding?.secondary_color ?? null}
      role={ctx.role}
    >
      {children}
    </AppShell>
  );
}
