import { NextResponse } from "next/server";
import { createFlightbookExport } from "@/lib/flightbook-exports";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as { note?: string | null };
  const admin = getSupabaseAdminClient();

  const result = await createFlightbookExport(admin, {
    organizationId: ctx.orgId,
    flightbookId: id,
    changeSource: "manual_version",
    createdBy: ctx.userId,
    note: payload.note?.trim() || "Saved manually from the current updated flight book.",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, export: result.exportRow });
}
