import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { History } from "lucide-react";
import HistoryClient, { type VersionRow } from "@/components/history/HistoryClient";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getOrgContext(): Promise<{ orgId: string | null; role: string }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { orgId: null, role: "viewer" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { orgId: null, role: "viewer" };

  const admin = getAdminClient();
  const { data } = await admin
    .from("org_users")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    orgId: (data?.organization_id as string | null) ?? null,
    role: (data?.role as string | null) ?? "viewer",
  };
}

export default async function HistoryPage() {
  const { orgId, role } = await getOrgContext();
  const isAdmin = role === "admin";
  const admin = getAdminClient();

  let query = admin
    .from("flightbook_section_versions")
    .select(`
      id,
      version_number,
      change_source,
      created_at,
      flightbook_section_id,
      flightbook_sections (
        section_number,
        title,
        flightbooks ( name )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;

  const rawVersions = error ? [] : (data ?? []);

  const versions: VersionRow[] = rawVersions.map((v) => {
    const sec = Array.isArray(v.flightbook_sections)
      ? v.flightbook_sections[0]
      : v.flightbook_sections;
    const fb = sec
      ? Array.isArray((sec as Record<string, unknown>).flightbooks)
        ? ((sec as Record<string, unknown>).flightbooks as { name?: string }[])[0]
        : (sec as Record<string, unknown>).flightbooks as { name?: string } | null
      : null;
    return {
      id: v.id as string,
      version_number: v.version_number as number,
      change_source: v.change_source as string,
      created_at: v.created_at as string,
      flightbook_section_id: v.flightbook_section_id as string,
      sectionNumber: ((sec as Record<string, unknown> | null)?.section_number as string | null) ?? null,
      sectionTitle: ((sec as Record<string, unknown> | null)?.title as string | null) ?? null,
      flightbookName: (fb?.name as string | null) ?? null,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="easa-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--easa-color-surface-2)]">
            <History size={20} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Time machine</h1>
            <p className="mt-0.5 text-sm text-[var(--easa-color-text-muted)]">
              Browse all version snapshots, compare any two, and roll back to any previous state.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-accent-pink)]">
            Failed to load version history. Please try again.
          </p>
        </div>
      )}

      {!error && versions.length === 0 && (
        <div className="easa-card p-10 text-center">
          <p className="text-sm font-medium">No version history found</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Versions are created when flight book sections are edited or AI updates are approved.
          </p>
        </div>
      )}

      {!error && versions.length > 0 && (
        <HistoryClient versions={versions} isAdmin={isAdmin} />
      )}
    </div>
  );
}
