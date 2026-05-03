import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import { runPipelineForOrganization } from "@/lib/pipeline/run-org-pipeline";

export async function POST() {
  try {
    const ctx = await getOrgAdminContext();
    if (!ctx) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const admin = getSupabaseAdminClient();
    const result = await runPipelineForOrganization(admin, ctx.orgId, {
      notifyAdmins: false,
      runLabel: "Manual scan",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected pipeline error.";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
