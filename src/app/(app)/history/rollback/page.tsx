import { History, RotateCcw } from "lucide-react";
import Link from "next/link";
import RollbackCalendar, { type RollbackVersionRow } from "@/components/history/RollbackCalendar";
import { getOptionalSupabaseAdminClient, getOrgAccessContext } from "@/lib/supabase/access";

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

export default async function RollbackPage() {
  const ctx = await getOrgAccessContext();
  const orgId = ctx?.orgId ?? null;
  const isAdmin = ctx?.role === "admin" || ctx?.role === "compliance_manager";
  const admin = getOptionalSupabaseAdminClient();

  let versions: RollbackVersionRow[] = [];

  if (admin && orgId) {
    const query = admin
      .from("flightbook_section_versions")
      .select("id, version_number, change_source, created_at, flightbook_section_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500);

    const { data, error } = await query;

    if (!error && data?.length) {
      const sectionIds = Array.from(
        new Set(
          data
            .map((v) => v.flightbook_section_id as string | null)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      const sectionMap = new Map<string, { section_number: string | null; title: string | null; flightbook_id: string | null }>();
      const flightbookMap = new Map<string, string | null>();

      if (sectionIds.length > 0) {
        const { data: sections, error: sectionsError } = await admin
          .from("flightbook_sections")
          .select("id, section_number, title, flightbook_id")
          .in("id", sectionIds);

        if (!sectionsError || isMissingSchemaError(sectionsError)) {
          for (const s of sections ?? []) {
            sectionMap.set(s.id as string, {
              section_number: (s.section_number as string | null) ?? null,
              title: (s.title as string | null) ?? null,
              flightbook_id: (s.flightbook_id as string | null) ?? null,
            });
          }

          const flightbookIds = Array.from(
            new Set(
              Array.from(sectionMap.values())
                .map((s) => s.flightbook_id)
                .filter((id): id is string => Boolean(id)),
            ),
          );

          if (flightbookIds.length > 0) {
            const { data: books } = await admin
              .from("flightbooks")
              .select("id, name")
              .in("id", flightbookIds);
            for (const b of books ?? []) {
              flightbookMap.set(b.id as string, (b.name as string | null) ?? null);
            }
          }
        }
      }

      versions = data.map((v) => {
        const section = sectionMap.get(v.flightbook_section_id as string);
        return {
          id: v.id as string,
          version_number: v.version_number as number,
          change_source: v.change_source as string,
          created_at: v.created_at as string,
          flightbook_section_id: v.flightbook_section_id as string,
          flightbookId: section?.flightbook_id ?? null,
          sectionNumber: section?.section_number ?? null,
          sectionTitle: section?.title ?? null,
          flightbookName: section?.flightbook_id
            ? (flightbookMap.get(section.flightbook_id) ?? null)
            : null,
        };
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="easa-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--easa-color-surface-2)]">
              <RotateCcw size={20} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Rollback calendar</h1>
              <p className="mt-0.5 text-sm text-[var(--easa-color-text-muted)]">
                Select a date to see every version snapshot taken that day and roll back any section.
              </p>
            </div>
          </div>
          <Link
            href="/history"
            className="easa-btn secondary flex items-center gap-2 text-sm"
          >
            <History size={15} strokeWidth={1.75} />
            Full history
          </Link>
        </div>

        {!isAdmin && (
          <p className="mt-4 rounded-xl border border-[var(--easa-color-accent-orange)] bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_8%,transparent)] px-4 py-2.5 text-xs text-[var(--easa-color-accent-orange)]">
            You have view-only access. Only admins and compliance managers can perform rollbacks.
          </p>
        )}
      </div>

      <RollbackCalendar versions={versions} isAdmin={isAdmin} />
    </div>
  );
}
