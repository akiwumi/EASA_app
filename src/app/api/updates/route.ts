import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

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
  if (error && isMissingSchemaError(error)) {
    return NextResponse.json({ items: [], total: 0, page, limit });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, limit });
}

// PATCH /api/updates — bulk action
export async function PATCH(request: Request) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, action, comment, flightbookSectionId, aiSuggestedText } = (await request.json()) as {
    ids?: string[];
    action?: string;
    comment?: string;
    flightbookSectionId?: string;
    aiSuggestedText?: string;
  };

  if (!ids?.length || !action) {
    return NextResponse.json({ error: "ids and action required" }, { status: 400 });
  }

  const validActions = ["approved", "rejected", "watchlist", "pending", "revision_requested"];
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
  if (updateErr && isMissingSchemaError(updateErr)) {
    return NextResponse.json({
      error:
        "The updates tables are not set up yet. Run the later Supabase migrations before approving updates.",
    }, { status: 400 });
  }
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  // Conflict detection — block if section was modified after this update was proposed
  if (action === "approved" && ids.length === 1 && flightbookSectionId) {
    const [{ data: updateRow }, { data: sectionRow }] = await Promise.all([
      admin.from("proposed_updates").select("created_at").eq("id", ids[0]).maybeSingle(),
      admin.from("flightbook_sections").select("updated_at").eq("id", flightbookSectionId).maybeSingle(),
    ]);
    if (updateRow && sectionRow) {
      const sectionUpdatedAt = new Date(sectionRow.updated_at as string).getTime();
      const updateCreatedAt = new Date(updateRow.created_at as string).getTime();
      if (sectionUpdatedAt > updateCreatedAt) {
        return NextResponse.json(
          {
            error:
              "Conflict: the flight book section was modified after this update was proposed. Review the current section body before approving.",
            conflict: true,
          },
          { status: 409 },
        );
      }
    }
  }

  // When approving a single update that has AI suggested text, apply it to the flight book section
  if (action === "approved" && ids.length === 1 && flightbookSectionId && aiSuggestedText) {
    // Get max version number for this section
    const { data: maxVerRow } = await admin
      .from("flightbook_section_versions")
      .select("version_number")
      .eq("flightbook_section_id", flightbookSectionId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((maxVerRow?.version_number as number | null) ?? 0) + 1;

    // Snapshot current body before overwriting
    const { data: currentSection } = await admin
      .from("flightbook_sections")
      .select("body, organization_id")
      .eq("id", flightbookSectionId)
      .maybeSingle();

    if (currentSection) {
      await admin.from("flightbook_section_versions").insert({
        organization_id: (currentSection.organization_id as string | null) ?? ctx.orgId,
        flightbook_section_id: flightbookSectionId,
        body: currentSection.body,
        version_number: nextVersion,
        change_source: "approved_update",
        created_by: ctx.userId,
      });

      // Apply the AI suggested text to the section body
      await admin
        .from("flightbook_sections")
        .update({ body: aiSuggestedText, updated_at: new Date().toISOString() })
        .eq("id", flightbookSectionId);
    }
  }

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

    // Send notifications to all org users (best-effort)
    try {
      const orgId = ctx.orgId;
      if (orgId) {
        const { data: orgUsers } = await admin
          .from("org_users")
          .select("user_id")
          .eq("organization_id", orgId);

        if (orgUsers && orgUsers.length > 0) {
          const notifTitle =
            action === "approved"
              ? `${ids.length} update${ids.length !== 1 ? "s" : ""} approved`
              : `${ids.length} update${ids.length !== 1 ? "s" : ""} rejected`;
          const notifBody = comment
            ? `Comment: ${comment}`
            : `Status changed to ${action}`;

          const notifRows = orgUsers.flatMap((ou) =>
            ids.map((id) => ({
              organization_id: orgId,
              user_id: ou.user_id as string,
              type: action,
              title: notifTitle,
              body: notifBody,
              related_entity_type: "proposed_update",
              related_entity_id: id,
            })),
          );

          await admin.from("notifications").insert(notifRows);
        }
      }
    } catch {
      // best-effort — notifications must never block the main response
    }

    // Audit log (best-effort)
    try {
      const auditRows = ids.map((id) => ({
        organization_id: ctx.orgId ?? undefined,
        actor_id: ctx.userId,
        action: `proposed_update_${action}`,
        entity_type: "proposed_update",
        entity_id: id,
        payload: { action, comment: comment ?? null },
      }));
      await admin.from("audit_log").insert(auditRows);
    } catch {
      // best-effort — audit must never block the main response
    }
  }

  return NextResponse.json({ ok: true, affected: ids.length });
}
