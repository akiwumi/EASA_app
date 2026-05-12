import { NextResponse } from "next/server";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";

function isMissingDeletedColumnError(error: { message?: string | null; code?: string | null } | null | undefined) {
  return (
    error?.code === "42703" ||
    /column .*deleted_at.* does not exist/i.test(error?.message ?? "") ||
    /could not find the 'deleted_at' column/i.test(error?.message ?? "")
  );
}

export async function POST(request: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    ids?: string[];
    action?: "delete" | "restore" | "permanent_delete";
  };
  const ids = Array.from(
    new Set((body.ids ?? []).filter((id): id is string => typeof id === "string" && id.length > 0)),
  ).slice(0, 100);

  if (ids.length === 0 || !body.action) {
    return NextResponse.json({ error: "ids and action required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  if (body.action === "delete") {
    const { error, count } = await admin
      .from("ai_findings")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.userId,
      }, { count: "exact" })
      .eq("organization_id", ctx.orgId)
      .in("id", ids)
      .is("deleted_at", null);

    if (isMissingDeletedColumnError(error)) {
      return NextResponse.json({
        error: "The deleted results migration has not been applied yet. Run supabase/migrations/schema/030_ai_findings_trash.sql.",
      }, { status: 400 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, affected: count ?? ids.length });
  }

  if (body.action === "restore") {
    const { error, count } = await admin
      .from("ai_findings")
      .update({
        deleted_at: null,
        deleted_by: null,
      }, { count: "exact" })
      .eq("organization_id", ctx.orgId)
      .in("id", ids)
      .not("deleted_at", "is", null);

    if (isMissingDeletedColumnError(error)) {
      return NextResponse.json({
        error: "The deleted results migration has not been applied yet. Run supabase/migrations/schema/030_ai_findings_trash.sql.",
      }, { status: 400 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, affected: count ?? ids.length });
  }

  if (body.action === "permanent_delete") {
    const { error, count } = await admin
      .from("ai_findings")
      .delete({ count: "exact" })
      .eq("organization_id", ctx.orgId)
      .in("id", ids)
      .not("deleted_at", "is", null);

    if (isMissingDeletedColumnError(error)) {
      return NextResponse.json({
        error: "The deleted results migration has not been applied yet. Run supabase/migrations/schema/030_ai_findings_trash.sql.",
      }, { status: 400 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, affected: count ?? ids.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
