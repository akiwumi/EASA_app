import { NextResponse } from "next/server";
import { createFlightbookExport } from "@/lib/flightbook-exports";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";

type ProposedUpdateExportRow = {
  id: string;
  flightbook_section_id: string | null;
};

type SectionBookRow = {
  id: string;
  flightbook_id: string | null;
};

export async function POST(request: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = (await request.json().catch(() => ({}))) as { ids?: string[] };
  const ids = Array.isArray(payload.ids)
    ? Array.from(new Set(payload.ids.filter((id): id is string => typeof id === "string" && id.length > 0))).slice(0, 100)
    : [];

  const admin = getSupabaseAdminClient();
  let updatesQuery = admin
    .from("proposed_updates")
    .select("id, flightbook_section_id")
    .eq("organization_id", ctx.orgId)
    .eq("status", "approved")
    .not("flightbook_section_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (ids.length > 0) {
    updatesQuery = updatesQuery.in("id", ids);
  }

  const { data: updates, error: updatesError } = await updatesQuery;
  if (updatesError) return NextResponse.json({ error: updatesError.message }, { status: 400 });

  const sectionIds = Array.from(
    new Set(
      ((updates ?? []) as ProposedUpdateExportRow[])
        .map((update) => update.flightbook_section_id)
        .filter((sectionId): sectionId is string => Boolean(sectionId)),
    ),
  );

  if (sectionIds.length === 0) {
    return NextResponse.json({ ok: true, exported: 0, message: "No approved updates with mapped flight book sections found." });
  }

  const { data: sections, error: sectionsError } = await admin
    .from("flightbook_sections")
    .select("id, flightbook_id")
    .eq("organization_id", ctx.orgId)
    .in("id", sectionIds);

  if (sectionsError) return NextResponse.json({ error: sectionsError.message }, { status: 400 });

  const flightbookIds = Array.from(
    new Set(
      ((sections ?? []) as SectionBookRow[])
        .map((section) => section.flightbook_id)
        .filter((flightbookId): flightbookId is string => Boolean(flightbookId)),
    ),
  );

  const exports = [];
  for (const flightbookId of flightbookIds) {
    const result = await createFlightbookExport(admin, {
      organizationId: ctx.orgId,
      flightbookId,
      changeSource: "manual_updated_books",
      createdBy: ctx.userId,
      note: "Created from the update queue after approved updates were completed.",
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    exports.push(result.exportRow);
  }

  return NextResponse.json({ ok: true, exported: exports.length, exports });
}
