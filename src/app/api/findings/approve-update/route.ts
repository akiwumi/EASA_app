import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request) {
  const { findingId, sectionId, approvedText } = (await request.json()) as {
    findingId?: string;
    sectionId?: string;
    approvedText?: string;
  };

  if (!findingId || !sectionId || !approvedText) {
    return NextResponse.json({ error: "findingId, sectionId and approvedText are required" }, { status: 400 });
  }

  const admin = getAdminClient();

  // 1. Fetch finding to get org
  const { data: finding } = await admin
    .from("ai_findings")
    .select("id, organization_id, summary")
    .eq("id", findingId)
    .maybeSingle();

  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  const orgId: string = (finding.organization_id as string | null) ?? DEFAULT_ORG_ID;

  // 2. Fetch the current section (to snapshot old body)
  const { data: section } = await admin
    .from("flightbook_sections")
    .select("id, body, organization_id")
    .eq("id", sectionId)
    .maybeSingle();

  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

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
    organization_id: (section.organization_id as string | null) ?? orgId,
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

  return NextResponse.json({ ok: true, versionNumber: nextVersion });
}
