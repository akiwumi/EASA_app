import { NextResponse } from "next/server";
import { getOrgAccessContext, getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";
import { createFlightbookExport } from "@/lib/flightbook-exports";
import type { RegulationChangeSummary, UpdateQueueItem } from "@/lib/types/domain";

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST205" ||
    /column .* does not exist/i.test(error.message ?? "") ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

async function getOrgContext() {
  return getOrgAccessContext();
}

type UpdateQueueViewRow = {
  id: string;
  classification: string | null;
  risk_level: string | null;
  confidence_score: number | null;
  status: string | null;
  ai_rationale: string | null;
  created_at: string;
  updated_at: string;
  reg_section_ref: string | null;
  change_type: string | null;
  diff_text: string | null;
  section_number: string | null;
  flightbook_section_title: string | null;
  reg_number: string | null;
  regulation_part: string | null;
};

type UpdateQueueLegacyRow = {
  id: string;
  classification: string | null;
  risk_level: string | null;
  confidence_score: number | null;
  status: string | null;
  ai_rationale: string | null;
  created_at: string;
  updated_at: string;
};

type FilterableQuery = {
  eq: (column: string, value: string) => FilterableQuery;
  order: (column: string, options: { ascending: boolean }) => FilterableQuery;
  range: (from: number, to: number) => FilterableQuery;
};

type SchemaError = { code?: string | null; message?: string | null };

type QueryResult<T> = {
  data: T[] | null;
  error: SchemaError | null;
  count: number | null;
};

type UntypedSupabaseClient = {
  from: (table: string) => {
    select: (columns: string, options?: { count?: "exact" }) => FilterableQuery;
  };
};

type ApprovedUpdateApplication = {
  id: string;
  flightbook_section_id: string | null;
  ai_suggested_text: string | null;
  created_at: string;
};

type SectionForUpdate = {
  id: string;
  body: string | null;
  organization_id: string | null;
  flightbook_id: string | null;
  updated_at: string | null;
};

function mapQueueRow(row: UpdateQueueViewRow): UpdateQueueItem {
  return {
    id: row.id,
    classification: row.classification ?? "watchlist",
    risk_level: row.risk_level ?? "medium",
    confidence_score: row.confidence_score,
    status: row.status ?? "pending",
    ai_rationale: row.ai_rationale,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reg_changes: {
      section_ref: row.reg_section_ref,
      change_type: row.change_type,
      diff_text: row.diff_text,
      reg_documents: {
        reg_number: row.reg_number,
        part: row.regulation_part,
      },
    },
    flightbook_sections: {
      section_number: row.section_number,
      title: row.flightbook_section_title,
    },
  };
}

function mapLegacyQueueRow(row: UpdateQueueLegacyRow): UpdateQueueItem {
  return {
    id: row.id,
    classification: row.classification ?? "watchlist",
    risk_level: row.risk_level ?? "medium",
    confidence_score: row.confidence_score,
    status: row.status ?? "pending",
    ai_rationale: row.ai_rationale,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reg_changes: {
      section_ref: null,
      change_type: null,
      diff_text: null,
      reg_documents: {
        reg_number: null,
        part: null,
      },
    },
    flightbook_sections: {
      section_number: null,
      title: null,
    },
  };
}

function hasRows<T>(result: QueryResult<T>) {
  return (result.data?.length ?? 0) > 0 || (result.count ?? 0) > 0;
}

async function applyApprovedUpdates(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  input: {
    ids: string[];
    organizationId: string;
    userId: string;
    fallbackSectionId?: string | null;
    fallbackSuggestedText?: string | null;
  },
) {
  const { data: updates, error: updatesError } = await admin
    .from("proposed_updates")
    .select("id, flightbook_section_id, ai_suggested_text, created_at")
    .eq("organization_id", input.organizationId)
    .in("id", input.ids);

  if (updatesError) return { ok: false as const, error: updatesError.message };

  const updateRows = ((updates ?? []) as ApprovedUpdateApplication[])
    .map((row) => ({
      ...row,
      flightbook_section_id: row.flightbook_section_id ?? input.fallbackSectionId ?? null,
      ai_suggested_text: row.ai_suggested_text ?? input.fallbackSuggestedText ?? null,
    }))
    .filter((row) => row.flightbook_section_id && row.ai_suggested_text);

  if (updateRows.length === 0) {
    return { ok: true as const, applied: 0, exported: 0 };
  }

  const sectionIds = Array.from(new Set(updateRows.map((row) => row.flightbook_section_id as string)));
  const { data: sections, error: sectionsError } = await admin
    .from("flightbook_sections")
    .select("id, body, organization_id, flightbook_id, updated_at")
    .eq("organization_id", input.organizationId)
    .in("id", sectionIds);

  if (sectionsError) return { ok: false as const, error: sectionsError.message };

  const sectionMap = new Map(
    ((sections ?? []) as SectionForUpdate[]).map((section) => [section.id, section]),
  );

  for (const update of updateRows) {
    const section = sectionMap.get(update.flightbook_section_id as string);
    if (!section) {
      return { ok: false as const, error: "Flight book section not found for approved update." };
    }

    const sectionUpdatedAt = section.updated_at ? new Date(section.updated_at).getTime() : 0;
    const updateCreatedAt = new Date(update.created_at).getTime();
    if (sectionUpdatedAt > updateCreatedAt) {
      return {
        ok: false as const,
        conflict: true,
        error:
          "Conflict: a flight book section was modified after an update was proposed. Review the current section body before approving.",
      };
    }
  }

  const appliedBookIds = new Set<string>();
  let applied = 0;

  for (const update of updateRows) {
    const sectionId = update.flightbook_section_id as string;
    const section = sectionMap.get(sectionId);
    if (!section) continue;

    const { data: maxVerRow } = await admin
      .from("flightbook_section_versions")
      .select("version_number")
      .eq("flightbook_section_id", sectionId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((maxVerRow?.version_number as number | null) ?? 0) + 1;

    const { error: versionError } = await admin.from("flightbook_section_versions").insert({
      organization_id: input.organizationId,
      flightbook_section_id: sectionId,
      body: section.body ?? "",
      version_number: nextVersion,
      change_source: "approved_update",
      created_by: input.userId,
    });

    if (versionError) return { ok: false as const, error: versionError.message };

    const { error: sectionUpdateError } = await admin
      .from("flightbook_sections")
      .update({ body: update.ai_suggested_text, updated_at: new Date().toISOString() })
      .eq("id", sectionId)
      .eq("organization_id", input.organizationId);

    if (sectionUpdateError) return { ok: false as const, error: sectionUpdateError.message };
    if (section.flightbook_id) appliedBookIds.add(section.flightbook_id);
    applied += 1;
  }

  let exported = 0;
  for (const flightbookId of appliedBookIds) {
    const exportResult = await createFlightbookExport(admin, {
      organizationId: input.organizationId,
      flightbookId,
      changeSource: "approved_update",
      createdBy: input.userId,
      note: `Generated automatically after ${applied} approved update${applied === 1 ? "" : "s"}.`,
    });
    if (!exportResult.ok) return { ok: false as const, error: exportResult.error };
    exported += 1;
  }

  return { ok: true as const, applied, exported };
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

  const admin = getSupabaseAdminClient();
  const untypedAdmin = admin as unknown as UntypedSupabaseClient;
  const applyFilters = (query: FilterableQuery) => {
    let next: FilterableQuery = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (ctx.orgId) next = next.eq("organization_id", ctx.orgId);
    if (status) next = next.eq("status", status);
    if (risk) next = next.eq("risk_level", risk);
    if (classification) next = next.eq("classification", classification);
    return next;
  };

  const viewQuery = applyFilters(
    untypedAdmin
      .from("v_update_queue")
      .select(`
        id,
        organization_id,
        classification,
        risk_level,
        confidence_score,
        status,
        ai_rationale,
        created_at,
        updated_at,
        reg_section_ref,
        change_type,
        diff_text,
        section_number,
        flightbook_section_title,
        reg_number,
        regulation_part
      `, { count: "exact" }) as FilterableQuery,
  );

  const viewResult = (await viewQuery) as unknown as QueryResult<UpdateQueueViewRow>;
  if (!viewResult.error && hasRows(viewResult)) {
    return NextResponse.json({
      items: ((viewResult.data ?? []) as UpdateQueueViewRow[]).map(mapQueueRow),
      total: viewResult.count ?? 0,
      page,
      limit,
    });
  }
  if (viewResult.error && !isMissingSchemaError(viewResult.error)) {
    return NextResponse.json({ error: viewResult.error.message }, { status: 400 });
  }

  const fallbackQuery = applyFilters(
    untypedAdmin
      .from("proposed_updates")
      .select(`
        id,
        organization_id,
        classification,
        risk_level,
        confidence_score,
        status,
        ai_rationale,
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
      `, { count: "exact" }) as FilterableQuery,
  );

  const fallbackResult = (await fallbackQuery) as unknown as QueryResult<{
    id: string;
    classification: string | null;
    risk_level: string | null;
    confidence_score: number | null;
    status: string | null;
    ai_rationale: string | null;
    created_at: string;
    updated_at: string;
    reg_changes: RegulationChangeSummary | null;
    flightbook_sections: {
      section_number: string | null;
      title: string | null;
    } | null;
  }>;
  if (fallbackResult.error && isMissingSchemaError(fallbackResult.error)) {
    const legacyQuery = applyFilters(
      untypedAdmin
        .from("proposed_updates")
        .select(`
          id,
          organization_id,
          classification,
          risk_level,
          confidence_score,
          status,
          ai_rationale,
          created_at,
          updated_at
        `, { count: "exact" }) as FilterableQuery,
    );

    const legacyResult = (await legacyQuery) as unknown as QueryResult<UpdateQueueLegacyRow>;
    if (legacyResult.error && isMissingSchemaError(legacyResult.error)) {
      return NextResponse.json({ items: [], total: 0, page, limit });
    }
    if (legacyResult.error) {
      return NextResponse.json({ error: legacyResult.error.message }, { status: 400 });
    }

    return NextResponse.json({
      items: ((legacyResult.data ?? []) as UpdateQueueLegacyRow[]).map(mapLegacyQueueRow),
      total: legacyResult.count ?? 0,
      page,
      limit,
    });
  }
  if (fallbackResult.error) {
    return NextResponse.json({ error: fallbackResult.error.message }, { status: 400 });
  }

  return NextResponse.json({
    items: fallbackResult.data ?? [],
    total: fallbackResult.count ?? 0,
    page,
    limit,
  });
}

// PATCH /api/updates — bulk action
export async function PATCH(request: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  const admin = getSupabaseAdminClient();

  if (action === "approved") {
    const application = await applyApprovedUpdates(admin, {
      ids,
      organizationId: ctx.orgId,
      userId: ctx.userId,
      fallbackSectionId: ids.length === 1 ? flightbookSectionId : null,
      fallbackSuggestedText: ids.length === 1 ? aiSuggestedText : null,
    });

    if (!application.ok) {
      return NextResponse.json(
        { error: application.error, conflict: "conflict" in application ? application.conflict : false },
        { status: "conflict" in application && application.conflict ? 409 : 400 },
      );
    }
  }

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
