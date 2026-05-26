import { NextResponse } from "next/server";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";
import { createFlightbookExport } from "@/lib/flightbook-exports";
import { loadDashboardStats, loadDashboardSetupSummary } from "@/services/dashboard";

function isMissingSnapshotSchema(error: { code?: string | null; message?: string | null } | null | undefined) {
  return (
    error?.code === "PGRST205" ||
    /audit_snapshots/i.test(error?.message ?? "") ||
    /audit_snapshot_exports/i.test(error?.message ?? "") ||
    /could not find the table/i.test(error?.message ?? "") ||
    /relation .* does not exist/i.test(error?.message ?? "")
  );
}

export async function GET() {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("audit_snapshots")
    .select("id, label, created_at, flightbook_count, pending_review_count, active_source_count, total_source_count")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isMissingSnapshotSchema(error)) {
    return NextResponse.json({ latest: null, missingSchema: true });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ latest: data ?? null });
}

export async function POST() {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const now = new Date();
  const label = `Audit baseline ${now.toISOString().slice(0, 10)}`;

  const [{ data: flightbooks, error: booksError }, stats, setupSummary] = await Promise.all([
    admin
      .from("flightbooks")
      .select("id, name")
      .eq("organization_id", ctx.orgId)
      .eq("active", true)
      .order("name", { ascending: true }),
    loadDashboardStats(ctx.orgId),
    loadDashboardSetupSummary(ctx.orgId),
  ]);

  if (booksError) return NextResponse.json({ error: booksError.message }, { status: 400 });

  const { data: snapshot, error: snapshotError } = await admin
    .from("audit_snapshots")
    .insert({
      organization_id: ctx.orgId,
      created_by: ctx.userId,
      label,
      flightbook_count: setupSummary.flightbookCount,
      pending_review_count: stats.pendingApprovals,
      approved_this_week_count: stats.approvedThisWeek,
      active_source_count: stats.sourcesActive,
      total_source_count: stats.sourcesTotal,
      metadata: {
        createdAt: now.toISOString(),
        source: "dashboard",
      },
    })
    .select("id, label, created_at, flightbook_count, pending_review_count, active_source_count, total_source_count")
    .maybeSingle();

  if (isMissingSnapshotSchema(snapshotError)) {
    return NextResponse.json({
      error: "Audit snapshots are not installed yet. Apply supabase/migrations/20260526131500_audit_snapshots.sql.",
      missingSchema: true,
    }, { status: 400 });
  }
  if (snapshotError || !snapshot?.id) {
    return NextResponse.json({ error: snapshotError?.message ?? "Unable to create audit snapshot." }, { status: 400 });
  }

  const exportRows: Array<{
    organization_id: string;
    audit_snapshot_id: string;
    flightbook_id: string;
    flightbook_export_id: string;
  }> = [];
  const exportResults: Array<{
    flightbookId: string;
    name: string;
    exportId: string;
    versionNumber: number;
    markdownPath: string;
    textPath: string;
  }> = [];

  for (const book of flightbooks ?? []) {
    const exportResult = await createFlightbookExport(admin, {
      organizationId: ctx.orgId,
      flightbookId: book.id as string,
      changeSource: "audit_snapshot",
      createdBy: ctx.userId,
      note: `Audit snapshot ${snapshot.label}`,
    });

    if (!exportResult.ok) {
      return NextResponse.json({ error: exportResult.error }, { status: 400 });
    }

    exportRows.push({
      organization_id: ctx.orgId,
      audit_snapshot_id: snapshot.id as string,
      flightbook_id: book.id as string,
      flightbook_export_id: exportResult.exportRow.id,
    });
    exportResults.push({
      flightbookId: book.id as string,
      name: (book.name as string | null) ?? "Flight book",
      exportId: exportResult.exportRow.id,
      versionNumber: exportResult.exportRow.versionNumber,
      markdownPath: exportResult.exportRow.markdownPath,
      textPath: exportResult.exportRow.textPath,
    });
  }

  if (exportRows.length > 0) {
    const { error: linkError } = await admin.from("audit_snapshot_exports").insert(exportRows);
    if (isMissingSnapshotSchema(linkError)) {
      return NextResponse.json({
        error: "Audit snapshot exports are not installed yet. Apply supabase/migrations/20260526131500_audit_snapshots.sql.",
        missingSchema: true,
      }, { status: 400 });
    }
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  await admin.from("audit_log").insert({
    organization_id: ctx.orgId,
    actor_id: ctx.userId,
    action: "audit_snapshot_created",
    entity_type: "audit_snapshot",
    entity_id: snapshot.id as string,
    payload: {
      label: snapshot.label,
      flightbookCount: setupSummary.flightbookCount,
      exportCount: exportResults.length,
    },
  });

  return NextResponse.json({
    ok: true,
    snapshot,
    exports: exportResults,
  });
}
