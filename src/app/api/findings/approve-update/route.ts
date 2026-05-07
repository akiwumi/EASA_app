import { NextResponse } from "next/server";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES, DEFAULT_ORG_ID } from "@/lib/supabase/access";
import { createFlightbookExport } from "@/lib/flightbook-exports";

export async function POST(request: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { findingId, sectionId, approvedText } = (await request.json()) as {
    findingId?: string;
    sectionId?: string;
    approvedText?: string;
  };

  if (!findingId || !sectionId || !approvedText) {
    return NextResponse.json({ error: "findingId, sectionId and approvedText are required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  // 1. Fetch finding to confirm it exists.
  const { data: finding } = await admin
    .from("ai_findings")
    .select("id, organization_id, summary")
    .eq("id", findingId)
    .maybeSingle();

  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  // 2. Fetch the current section (to snapshot old body)
  const { data: section } = await admin
    .from("flightbook_sections")
    .select("id, body, organization_id, flightbook_id, title, section_number")
    .eq("id", sectionId)
    .maybeSingle();

  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const sectionOrgId = (section.organization_id as string | null) ?? ctx.orgId;
  // Allow access if the section belongs to the user's org or to the shared default org
  if (sectionOrgId !== ctx.orgId && sectionOrgId !== DEFAULT_ORG_ID) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }
  const orgId = sectionOrgId;

  // 3. Determine next version number
  const { data: latestVersion } = await admin
    .from("flightbook_section_versions")
    .select("version_number")
    .eq("flightbook_section_id", sectionId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = ((latestVersion?.version_number as number | null) ?? 0) + 1;

  // 4. Save a version snapshot of the *current* body before overwriting
  const { error: versionErr } = await admin.from("flightbook_section_versions").insert({
    organization_id: orgId,
    flightbook_section_id: sectionId,
    body: section.body as string,
    version_number: nextVersion,
    change_source: `ai-finding:${findingId}`,
  });

  if (versionErr) {
    return NextResponse.json({ error: versionErr.message }, { status: 400 });
  }

  // 5. Update the section body with the approved text
  const { error: updateErr } = await admin
    .from("flightbook_sections")
    .update({ body: approvedText, updated_at: new Date().toISOString() })
    .eq("id", sectionId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // 6. Mark the proposed_update as approved (best effort — may not exist yet)
  await admin
    .from("proposed_updates")
    .update({
      status: "approved",
      ai_suggested_text: approvedText,
      flightbook_section_id: sectionId,
      updated_at: new Date().toISOString(),
    })
    .eq("ai_rationale", (finding.summary as string | null) ?? "")
    .eq("organization_id", orgId);

  try {
    const { data: orgUsers } = await admin
      .from("org_users")
      .select("user_id")
      .eq("organization_id", orgId);

    if (orgUsers?.length) {
      const sectionLabel = [
        (section.section_number as string | null) ? `§${section.section_number as string}` : null,
        (section.title as string | null) ?? null,
      ].filter(Boolean).join(" ");

      await admin.from("notifications").insert(
        orgUsers.map((member) => ({
          organization_id: orgId,
          user_id: member.user_id as string,
          type: "approved",
          title: "Finding approved",
          body: sectionLabel
            ? `Approved update for ${sectionLabel}.`
            : "An AI finding was approved and applied to a flight book section.",
          related_entity_type: "ai_finding",
          related_entity_id: findingId,
        })),
      );
    }
  } catch {
    // best-effort — notifications must never block the main response
  }

  if (section.flightbook_id) {
    await createFlightbookExport(admin, {
      organizationId: orgId,
      flightbookId: section.flightbook_id as string,
      changeSource: "approved_finding",
      createdBy: ctx.userId,
      note: `Generated automatically from approved finding ${findingId}.`,
    });
  }

  return NextResponse.json({ ok: true, versionNumber: nextVersion });
}
