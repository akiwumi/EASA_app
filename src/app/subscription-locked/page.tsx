import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function SubscriptionLockedPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  let role: string | null = null;
  if (supabase && user) {
    const { data: orgUser } = await supabase
      .from("org_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    role = orgUser?.role ? String(orgUser.role) : null;
  }

  return (
    <main className="easa-shell flex min-h-screen items-center justify-center py-12">
      <section className="easa-card-glass w-full max-w-2xl p-8">
        <span className="easa-eyebrow">Workspace locked</span>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--easa-color-text-primary)]">
          This workspace is temporarily locked.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--easa-color-text-muted)]">
          Access for this organization is currently marked as suspended in the workspace settings. An admin can review the school access record and reopen access if needed.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {role === "admin" ? (
            <Link className="easa-btn primary" href="/settings?tab=branding">
              Open school settings
            </Link>
          ) : null}
          <Link className="easa-btn secondary" href="/login">
            Back to login
          </Link>
        </div>

        <p className="mt-6 text-xs text-[var(--easa-color-text-muted)]">
          Admins can review access state in settings. Non-admin users should contact their school administrator.
        </p>
      </section>
    </main>
  );
}
