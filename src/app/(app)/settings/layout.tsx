import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgAdminContext } from "@/lib/supabase/access";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getOrgAdminContext();
  if (!ctx) redirect("/dashboard");

  return <>{children}</>;
}
