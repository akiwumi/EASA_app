import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getAuthUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

async function getOrgId(userId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("org_users")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.organization_id as string | null) ?? null;
}

// POST /api/rollback  body: { sectionId, targetVersionNumber, reason? }
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const orgId = await getOrgId(user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organisation found for user" }, { status: 403 });
  }

  const admin = getAdminClient();

  // 1. Get the target version body
  const { data: targetVersion, error: tvErr } = await admin
    .from("flightbook_section_versions")
    .select("body, version_number")
    .eq("flightbook_section_id", sectionId)
    .eq("version_number", targetVersionNumber)
    .maybeSingle();

  if (tvErr || !targetVersion) {
    return NextResponse.json({ error: "Target version not found" }, { status: 404 });
  }

  // 2. Get current section body
  const { data: section, error: secErr } = await admin
    .from("flightbook_sections")
    .select("body, organization_id")
    .eq("id", sectionId)
    .maybeSingle();

  if (secErr || !section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
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
    organization_id: orgId,
    flightbook_section_id: sectionId,
    body: section.body,
    version_number: newVersionNumber,
    change_source: "rollback",
    created_by: user.id,
  });

  if (snapErr) {
    return NextResponse.json({ error: snapErr.message }, { status: 400 });
  }

  // 5. UPDATE flightbook_sections.body to target version body
  const { error: updateErr } = await admin
    .from("flightbook_sections")
    .update({ body: targetVersion.body })
    .eq("id", sectionId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // 6. INSERT audit_log record
  await admin.from("audit_log").insert({
    organization_id: orgId,
    actor_id: user.id,
    action: "rollback",
    entity_type: "flightbook_section",
    entity_id: sectionId,
    payload: {
      fromVersion: newVersionNumber,
      toVersion: targetVersionNumber,
      reason: reason ?? null,
    },
  });

  return NextResponse.json({ ok: true, newVersionNumber });
}
