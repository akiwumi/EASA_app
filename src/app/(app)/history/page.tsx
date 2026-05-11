import { createClient } from "@supabase/supabase-js";
import { History } from "lucide-react";
import HistoryClient, { type VersionRow, type FileEventRow } from "@/components/history/HistoryClient";
import { getOrgAccessContext } from "@/lib/supabase/access";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

export default async function HistoryPage() {
  const ctx = await getOrgAccessContext();
  const orgId = ctx?.orgId ?? null;
  const role = ctx?.role ?? "viewer";
  const isAdmin = role === "admin";
  const admin = getAdminClient();

  // --- Section versions ---
  let query = admin
    .from("flightbook_section_versions")
    .select("id, version_number, change_source, created_at, flightbook_section_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query;
  const rawVersions = error ? [] : (data ?? []);

  const sectionIds = Array.from(
    new Set(
      rawVersions
        .map((v) => v.flightbook_section_id as string | null)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const sectionMap = new Map<string, { section_number: string | null; title: string | null; flightbook_id: string | null }>();
  const flightbookMap = new Map<string, string | null>();
  let loadError = error;

  if (!error && sectionIds.length > 0) {
    const { data: sections, error: sectionsError } = await admin
      .from("flightbook_sections")
      .select("id, section_number, title, flightbook_id")
      .in("id", sectionIds);

    if (sectionsError && !isMissingSchemaError(sectionsError)) {
      loadError = sectionsError;
    } else {
      for (const section of sections ?? []) {
        sectionMap.set(section.id as string, {
          section_number: (section.section_number as string | null) ?? null,
          title: (section.title as string | null) ?? null,
          flightbook_id: (section.flightbook_id as string | null) ?? null,
        });
      }

      const flightbookIds = Array.from(
        new Set(Array.from(sectionMap.values()).map((s) => s.flightbook_id).filter((v): v is string => Boolean(v))),
      );

      if (flightbookIds.length > 0) {
        const { data: flightbooks, error: flightbooksError } = await admin
          .from("flightbooks")
          .select("id, name")
          .in("id", flightbookIds);

        if (flightbooksError && !isMissingSchemaError(flightbooksError)) {
          loadError = flightbooksError;
        } else {
          for (const book of flightbooks ?? []) {
            flightbookMap.set(book.id as string, (book.name as string | null) ?? null);
          }
        }
      }
    }
  }

  const versions: VersionRow[] = rawVersions.map((v) => {
    const section = sectionMap.get(v.flightbook_section_id as string);
    return {
      id: v.id as string,
      version_number: v.version_number as number,
      change_source: v.change_source as string,
      created_at: v.created_at as string,
      flightbook_section_id: v.flightbook_section_id as string,
      sectionNumber: section?.section_number ?? null,
      sectionTitle: section?.title ?? null,
      flightbookName: section?.flightbook_id ? (flightbookMap.get(section.flightbook_id) ?? null) : null,
    };
  });

  // --- Flightbook file events ---
  let fileEvents: FileEventRow[] = [];
  if (orgId) {
    const { data: eventsData, error: eventsError } = await admin
      .from("flightbook_events")
      .select("id, flightbook_id, event_type, actor_id, note, metadata, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!eventsError && eventsData) {
      const bookIds = Array.from(new Set(eventsData.map((e) => e.flightbook_id as string).filter(Boolean)));
      const bookNameMap = new Map<string, string>();

      if (bookIds.length > 0) {
        const { data: books } = await admin
          .from("flightbooks")
          .select("id, name")
          .in("id", bookIds);
        for (const b of books ?? []) {
          bookNameMap.set(b.id as string, (b.name as string) ?? "Unknown");
        }
      }

      fileEvents = eventsData.map((e) => ({
        id: e.id as string,
        flightbook_id: e.flightbook_id as string,
        event_type: e.event_type as string,
        actor_id: (e.actor_id as string | null) ?? null,
        note: (e.note as string | null) ?? null,
        metadata: (e.metadata as Record<string, unknown> | null) ?? null,
        created_at: e.created_at as string,
        flightbookName: bookNameMap.get(e.flightbook_id as string) ?? null,
      }));
    }
  }

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
              Browse all version snapshots and file events, compare any two, and roll back to any previous state.
            </p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-accent-pink)]">
            Failed to load version history. Please try again.
          </p>
        </div>
      )}

      {!loadError && versions.length === 0 && fileEvents.length === 0 && (
        <div className="easa-card p-10 text-center">
          <p className="text-sm font-medium">No version history found</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Versions are created when flight book sections are edited or AI updates are approved.
          </p>
        </div>
      )}

      {!loadError && (versions.length > 0 || fileEvents.length > 0) && (
        <HistoryClient versions={versions} fileEvents={fileEvents} isAdmin={isAdmin} />
      )}
    </div>
  );
}
