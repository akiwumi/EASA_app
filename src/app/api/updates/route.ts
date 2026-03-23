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

async function getOrgContext() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getAdminClient();
  const { data: orgUser } = await admin
    .from("org_users")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  return orgUser ? { userId: user.id, orgId: orgUser.organization_id as string, role: orgUser.role as string } : { userId: user.id, orgId: null, role: "admin" };
}

// GET /api/updates?status=&risk=&classification=&page=1&limit=50
export async function GET(request: Request) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const risk = searchParams.get("risk");
  const classification = searchParams.get("classification");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") ?? 50)));
  const offset = (page - 1) * limit;

  const admin = getAdminClient();

  let query = admin
    .from("proposed_updates")
    .select(`
      id,
      classification,
      risk_level,
      confidence_score,
      status,
      ai_rationale,
      ai_suggested_text,
      created_at,
      updated_at,
      reg_changes (
        section_ref,
        change_type,
        diff_text,
        reg_documents ( reg_number, part )
      ),
      flightbook_sections (
        section_number,
        title
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (ctx.orgId) {
    query = query.eq("organization_id", ctx.orgId);
  }
  if (status) query = query.eq("status", status);
  if (risk) query = query.eq("risk_level", risk);
  if (classification) query = query.eq("classification", classification);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, limit });
}

// PATCH /api/updates — bulk action
export async function PATCH(request: Request) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, action, comment } = (await request.json()) as {
    ids?: string[];
    action?: string;
    comment?: string;
  };

  if (!ids?.length || !action) {
    return NextResponse.json({ error: "ids and action required" }, { status: 400 });
  }

  const validActions = ["approved", "rejected", "watchlist", "pending"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const admin = getAdminClient();

  // Update proposed_updates status
  const updateQ = admin
    .from("proposed_updates")
    .update({ status: action, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (ctx.orgId) updateQ.eq("organization_id", ctx.orgId);

  const { error: updateErr } = await updateQ;
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  // Insert approval records for approve/reject actions
  if (action === "approved" || action === "rejected") {
    const approvalRecords = ids.map((id) => ({
      proposed_update_id: id,
      organization_id: ctx.orgId ?? ids[0],
      action,
      approver_id: ctx.userId,
      comment: comment ?? null,
    }));

    // best-effort — don't block on approval insert errors
    await admin.from("approvals").insert(approvalRecords);
  }

  return NextResponse.json({ ok: true, affected: ids.length });
}
