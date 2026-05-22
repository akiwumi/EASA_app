import { NextResponse } from "next/server";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_ROLLBACK_ROLES } from "@/lib/supabase/access";
import { createFlightbookExport } from "@/lib/flightbook-exports";

// POST /api/rollback  body: { sectionId, targetVersionNumber, reason? }
export async function POST(request: Request) {
  const ctx = await getOrgScopedContext(ORG_ROLLBACK_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { sectionId, targetVersionNumber, reason } = (await request.json()) as {
    sectionId?: string;
    targetVersionNumber?: number;
    reason?: string;
  };

  if (!sectionId || targetVersionNumber == null) {
    return NextResponse.json(
      { error: "sectionId and targetVersionNumber required" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdminClient();

  // 1. Get the target version body (scoped by org)
  const { data: targetVersion, error: tvErr } = await admin
    .from("flightbook_section_versions")
    .select("body, version_number, organization_id")
    .eq("organization_id", ctx.orgId)
    .eq("flightbook_section_id", sectionId)
    .eq("version_number", targetVersionNumber)
    .maybeSingle();

  if (tvErr || !targetVersion) {
    return NextResponse.json({ error: "Target version not found" }, { status: 404 });
  }

  // 2. Get current section body
  const { data: section, error: secErr } = await admin
    .from("flightbook_sections")
    .select("body, organization_id, flightbook_id, section_number, title")
    .eq("id", sectionId)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (secErr || !section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  // No-op guard: don't roll back if already at that version's content
  if ((section.body as string) === (targetVersion.body as string)) {
    return NextResponse.json({ error: "Section already matches that version." }, { status: 409 });
  }

  // 3. Get max version number
  const { data: maxVerRow } = await admin
    .from("flightbook_section_versions")
    .select("version_number")
    .eq("flightbook_section_id", sectionId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentMaxVersion: number = (maxVerRow?.version_number as number | null) ?? 0;
  const newVersionNumber = currentMaxVersion + 1;

  // 4. INSERT snapshot of the current body before rollback
  const { error: snapErr } = await admin.from("flightbook_section_versions").insert({
    organization_id: ctx.orgId,
    flightbook_section_id: sectionId,
    body: section.body,
    version_number: newVersionNumber,
    change_source: "rollback",
    created_by: ctx.userId,
  });

  if (snapErr) {
    return NextResponse.json({ error: snapErr.message }, { status: 400 });
  }

  // 5. UPDATE flightbook_sections.body to target version body (scoped by org)
  const { error: updateErr } = await admin
    .from("flightbook_sections")
    .update({ body: targetVersion.body, updated_at: new Date().toISOString() })
    .eq("id", sectionId)
    .eq("organization_id", ctx.orgId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // 5b. Refresh embeddings after rollback (best-effort)
  try {
    const { enrichFlightbookSectionEmbeddings } = await import("@/lib/ai/embeddings");
    await enrichFlightbookSectionEmbeddings(admin, [{
      id: sectionId,
      organization_id: ctx.orgId,
      section_number: (section.section_number as string | null) ?? null,
      title: (section.title as string | null) ?? null,
      body: targetVersion.body as string,
    }]);
  } catch {
    // best-effort — embedding refresh must never block rollback
  }

  // 6. INSERT audit_log record
  await admin.from("audit_log").insert({
    organization_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "rollback",
    entity_type: "flightbook_section",
    entity_id: sectionId,
    payload: {
      fromVersion: newVersionNumber,
      toVersion: targetVersionNumber,
      reason: reason ?? null,
    },
  });

  try {
    const { data: orgUsers } = await admin
      .from("org_users")
      .select("user_id")
      .eq("organization_id", ctx.orgId);

    if (orgUsers?.length) {
      await admin.from("notifications").insert(
        orgUsers.map((member) => ({
          organization_id: ctx.orgId,
          user_id: member.user_id as string,
          type: "rollback",
          title: "Section rolled back",
          body: reason
            ? `Rolled back to version ${targetVersionNumber}. Reason: ${reason}`
            : `Section rolled back to version ${targetVersionNumber}.`,
          related_entity_type: "flightbook_section",
          related_entity_id: sectionId,
        })),
      );
    }
  } catch {
    // best-effort — notification delivery must never block rollback
  }

  let exportWarning: string | undefined;
  if (section.flightbook_id) {
    const exportResult = await createFlightbookExport(admin, {
      organizationId: ctx.orgId,
      flightbookId: section.flightbook_id as string,
      changeSource: "rollback",
      createdBy: ctx.userId,
      note: reason ? `Generated automatically after rollback. Reason: ${reason}` : "Generated automatically after rollback.",
    });
    if (!exportResult.ok) {
      exportWarning = exportResult.error;
    }
  }

  return NextResponse.json({ ok: true, newVersionNumber, ...(exportWarning ? { exportWarning } : {}) });
}
