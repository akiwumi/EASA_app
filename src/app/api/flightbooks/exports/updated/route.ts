import { NextResponse } from "next/server";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";
import { applyApprovedUpdates } from "@/lib/updates/apply-approved-updates";

type PendingMappedUpdateRow = {
  id: string;
};

async function loadPendingMappedUpdateIds(admin: ReturnType<typeof getSupabaseAdminClient>, organizationId: string) {
  const ids: string[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await admin
      .from("proposed_updates")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .not("flightbook_section_id", "is", null)
      .not("ai_suggested_text", "is", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) return { ids, error: error.message };

    const rows = (data ?? []) as PendingMappedUpdateRow[];
    ids.push(...rows.map((update) => update.id));

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return { ids, error: null };
}

export async function POST(request: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await request.json().catch(() => ({}));

  const admin = getSupabaseAdminClient();
  const { ids: updateIds, error: updatesError } = await loadPendingMappedUpdateIds(admin, ctx.orgId);
  if (updatesError) return NextResponse.json({ error: updatesError }, { status: 400 });

  if (updateIds.length === 0) {
    return NextResponse.json({
      ok: true,
      approved: 0,
      applied: 0,
      exported: 0,
      message: "No pending mapped updates with generated text found.",
    });
  }

  const application = await applyApprovedUpdates(admin, {
    ids: updateIds,
    organizationId: ctx.orgId,
    userId: ctx.userId,
  });

  if (!application.ok) {
    return NextResponse.json(
      { error: application.error, conflict: "conflict" in application ? application.conflict : false },
      { status: "conflict" in application && application.conflict ? 409 : 400 },
    );
  }

  const approvedAt = new Date().toISOString();
  const updateQ = admin
    .from("proposed_updates")
    .update({ status: "approved", updated_at: approvedAt })
    .eq("organization_id", ctx.orgId)
    .in("id", updateIds);

  const { error: updateErr } = await updateQ;
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  const approvalRecords = updateIds.map((id) => ({
    proposed_update_id: id,
    organization_id: ctx.orgId,
    action: "approved",
    approver_id: ctx.userId,
    comment: "Approved automatically from update queue completion.",
  }));
  await admin.from("approvals").insert(approvalRecords);

  try {
    await admin.from("audit_log").insert(
      updateIds.map((id) => ({
        organization_id: ctx.orgId,
        actor_id: ctx.userId,
        action: "proposed_update_approved",
        entity_type: "proposed_update",
        entity_id: id,
        payload: { action: "approved", source: "queue_completion" },
      })),
    );
  } catch {
    // best-effort audit log
  }

  return NextResponse.json({
    ok: true,
    approved: updateIds.length,
    applied: application.applied,
    exported: application.exported,
    message:
      `${updateIds.length} pending mapped update${updateIds.length === 1 ? "" : "s"} approved. ` +
      `${application.exported} updated flight book${application.exported === 1 ? "" : "s"} created.`,
  });
}
