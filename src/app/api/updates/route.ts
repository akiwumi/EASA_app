import { NextResponse } from "next/server";
import { getOrgAccessContext, getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";
import { applyApprovedUpdates } from "@/lib/updates/apply-approved-updates";
import type { UpdateQueueItem } from "@/lib/types/domain";

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST205" ||
    /column .* does not exist/i.test(error.message ?? "") ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

function isRangeNotSatisfiableError(error: { code?: string | null; message?: string | null }) {
  return error.code === "PGRST103" || /requested range not satisfiable/i.test(error.message ?? "");
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

type UpdateQueueFlatRow = UpdateQueueLegacyRow & {
  reg_change_id: string | null;
  flightbook_section_id: string | null;
};

type FilterableQuery = {
  eq: (column: string, value: string) => FilterableQuery;
  in: (column: string, values: string[]) => FilterableQuery;
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

async function loadRegChangeIdsForRegulation(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  regulation: string | null,
) {
  if (!regulation) return { ids: null as string[] | null, error: null as string | null };

  const { data: documents, error: documentError } = await admin
    .from("reg_documents")
    .select("id")
    .eq("reg_number", regulation);
  if (documentError) return { ids: [], error: documentError.message };

  const documentIds = (documents ?? []).map((row) => row.id as string).filter(Boolean);
  if (documentIds.length === 0) return { ids: [], error: null };

  const { data: changes, error: changesError } = await admin
    .from("reg_changes")
    .select("id")
    .in("reg_document_id", documentIds);
  if (changesError) return { ids: [], error: changesError.message };

  return {
    ids: (changes ?? []).map((row) => row.id as string).filter(Boolean),
    error: null,
  };
}

async function hydrateFlatQueueRows(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  rows: UpdateQueueFlatRow[],
): Promise<UpdateQueueItem[]> {
  const regChangeIds = Array.from(new Set(rows.map((row) => row.reg_change_id).filter(Boolean))) as string[];
  const sectionIds = Array.from(new Set(rows.map((row) => row.flightbook_section_id).filter(Boolean))) as string[];

  const { data: regChanges } = regChangeIds.length
    ? await admin
        .from("reg_changes")
        .select("id, section_ref, change_type, diff_text, reg_document_id")
        .in("id", regChangeIds)
    : { data: [] };

  const regDocumentIds = Array.from(
    new Set((regChanges ?? []).map((row) => row.reg_document_id as string | null).filter(Boolean)),
  ) as string[];

  const { data: regDocuments } = regDocumentIds.length
    ? await admin
        .from("reg_documents")
        .select("id, reg_number, part")
        .in("id", regDocumentIds)
    : { data: [] };

  const { data: sections } = sectionIds.length
    ? await admin
        .from("flightbook_sections")
        .select("id, section_number, title")
        .in("id", sectionIds)
    : { data: [] };

  const regChangeById = new Map((regChanges ?? []).map((row) => [row.id as string, row]));
  const regDocumentById = new Map((regDocuments ?? []).map((row) => [row.id as string, row]));
  const sectionById = new Map((sections ?? []).map((row) => [row.id as string, row]));

  return rows.map((row) => {
    const regChange = row.reg_change_id ? regChangeById.get(row.reg_change_id) : null;
    const regDocument = regChange?.reg_document_id
      ? regDocumentById.get(regChange.reg_document_id as string)
      : null;
    const section = row.flightbook_section_id ? sectionById.get(row.flightbook_section_id) : null;

    return {
      ...mapLegacyQueueRow(row),
      reg_changes: {
        section_ref: (regChange?.section_ref as string | null | undefined) ?? null,
        change_type: (regChange?.change_type as string | null | undefined) ?? null,
        diff_text: (regChange?.diff_text as string | null | undefined) ?? null,
        reg_documents: {
          reg_number: (regDocument?.reg_number as string | null | undefined) ?? null,
          part: (regDocument?.part as string | null | undefined) ?? null,
        },
      },
      flightbook_sections: {
        section_number: (section?.section_number as string | null | undefined) ?? null,
        title: (section?.title as string | null | undefined) ?? null,
      },
    };
  });
}

// GET /api/updates?status=&risk=&classification=&page=1&limit=50
export async function GET(request: Request) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const risk = searchParams.get("risk");
  const classification = searchParams.get("classification");
  const regulation = searchParams.get("regulation");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") ?? 50)));
  const offset = (page - 1) * limit;

  const admin = getSupabaseAdminClient();
  const untypedAdmin = admin as unknown as UntypedSupabaseClient;
  const applyFilters = (query: FilterableQuery, includeRegulation = false) => {
    let next: FilterableQuery = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (ctx.orgId) next = next.eq("organization_id", ctx.orgId);
    if (status) next = next.eq("status", status);
    if (risk) next = next.eq("risk_level", risk);
    if (classification) next = next.eq("classification", classification);
    if (includeRegulation && regulation) next = next.eq("reg_number", regulation);
    return next;
  };

  const regulationsQuery = (() => {
    let query = untypedAdmin
      .from("v_update_queue")
      .select("reg_number") as FilterableQuery;
    if (ctx.orgId) query = query.eq("organization_id", ctx.orgId);
    if (status) query = query.eq("status", status);
    if (risk) query = query.eq("risk_level", risk);
    if (classification) query = query.eq("classification", classification);
    return query.order("reg_number", { ascending: true });
  })();
  const regulationsResult = (await regulationsQuery) as unknown as QueryResult<{ reg_number: string | null }>;
  const regulations = !regulationsResult.error
    ? Array.from(
        new Set(
          (regulationsResult.data ?? [])
            .map((row) => row.reg_number)
            .filter((regNumber): regNumber is string => Boolean(regNumber)),
        ),
      )
    : [];

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
    true,
  );

  const viewResult = (await viewQuery) as unknown as QueryResult<UpdateQueueViewRow>;
  if (!viewResult.error && hasRows(viewResult)) {
    return NextResponse.json({
      items: ((viewResult.data ?? []) as UpdateQueueViewRow[]).map(mapQueueRow),
      total: viewResult.count ?? 0,
      page,
      limit,
      regulations,
    });
  }
  if (
    viewResult.error &&
    !isMissingSchemaError(viewResult.error) &&
    !isRangeNotSatisfiableError(viewResult.error)
  ) {
    return NextResponse.json({ error: viewResult.error.message }, { status: 400 });
  }

  const regChangeFilter = await loadRegChangeIdsForRegulation(admin, regulation);
  if (regChangeFilter.error) {
    return NextResponse.json({ error: regChangeFilter.error }, { status: 400 });
  }
  if (regChangeFilter.ids?.length === 0) {
    return NextResponse.json({ items: [], total: 0, page, limit, regulations });
  }

  let fallbackQuery = applyFilters(
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
        reg_change_id,
        flightbook_section_id
      `, { count: "exact" }) as FilterableQuery,
  );
  if (regChangeFilter.ids) fallbackQuery = fallbackQuery.in("reg_change_id", regChangeFilter.ids);

  const fallbackResult = (await fallbackQuery) as unknown as QueryResult<UpdateQueueFlatRow>;
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
      regulations,
    });
  }
  if (fallbackResult.error && isRangeNotSatisfiableError(fallbackResult.error)) {
    return NextResponse.json({ items: [], total: 0, page, limit, regulations });
  }
  if (fallbackResult.error) {
    return NextResponse.json({ error: fallbackResult.error.message }, { status: 400 });
  }

  return NextResponse.json({
    items: await hydrateFlatQueueRows(admin, (fallbackResult.data ?? []) as UpdateQueueFlatRow[]),
    total: fallbackResult.count ?? 0,
    page,
    limit,
    regulations,
  });
}

async function loadMatchingQueueIds(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  input: {
    organizationId: string;
    status?: string | null;
    risk?: string | null;
    classification?: string | null;
    regulation?: string | null;
  },
) {
  const untypedAdmin = admin as unknown as UntypedSupabaseClient;
  let query = untypedAdmin
    .from("proposed_updates")
    .select(`
      id,
      reg_changes (
        reg_documents ( reg_number )
      )
    `) as FilterableQuery;

  query = query.eq("organization_id", input.organizationId);
  if (input.status) query = query.eq("status", input.status);
  if (input.risk) query = query.eq("risk_level", input.risk);
  if (input.classification) query = query.eq("classification", input.classification);

  const result = (await query
    .order("created_at", { ascending: false })
    .range(0, 4999)) as unknown as QueryResult<{
      id: string;
      reg_changes:
        | { reg_documents: { reg_number: string | null } | { reg_number: string | null }[] | null }
        | { reg_documents: { reg_number: string | null } | { reg_number: string | null }[] | null }[]
        | null;
    }>;
  if (result.error) return { ids: [], error: result.error.message };

  const ids = (result.data ?? [])
    .filter((row) => {
      if (!input.regulation) return true;
      const regChange = Array.isArray(row.reg_changes) ? row.reg_changes[0] : row.reg_changes;
      const regDocument = Array.isArray(regChange?.reg_documents)
        ? regChange.reg_documents[0]
        : regChange?.reg_documents;
      return regDocument?.reg_number === input.regulation;
    })
    .map((row) => row.id);

  return { ids, error: null };
}

// PATCH /api/updates — bulk action
export async function PATCH(request: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const {
    ids,
    action,
    comment,
    flightbookSectionId,
    aiSuggestedText,
    clearAfterApproval,
    status,
    risk,
    classification,
    regulation,
  } = (await request.json()) as {
    ids?: string[];
    action?: string;
    comment?: string;
    flightbookSectionId?: string;
    aiSuggestedText?: string;
    clearAfterApproval?: boolean;
    status?: string;
    risk?: string;
    classification?: string;
    regulation?: string;
  };

  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  const validActions = ["approved", "rejected", "watchlist", "pending", "boneyard", "revision_requested"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  let targetIds = ids?.filter((id): id is string => typeof id === "string" && id.length > 0) ?? [];

  if (targetIds.length === 0 && action === "boneyard" && regulation) {
    const matchResult = await loadMatchingQueueIds(admin, {
      organizationId: ctx.orgId,
      status,
      risk,
      classification,
      regulation,
    });
    if (matchResult.error) return NextResponse.json({ error: matchResult.error }, { status: 400 });
    targetIds = matchResult.ids;
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ ok: true, affected: 0, status: action });
  }

  if (action === "approved") {
    const application = await applyApprovedUpdates(admin, {
      ids: targetIds,
      organizationId: ctx.orgId,
      userId: ctx.userId,
      fallbackSectionId: targetIds.length === 1 ? flightbookSectionId : null,
      fallbackSuggestedText: targetIds.length === 1 ? aiSuggestedText : null,
    });

    if (!application.ok) {
      return NextResponse.json(
        { error: application.error, conflict: "conflict" in application ? application.conflict : false },
        { status: "conflict" in application && application.conflict ? 409 : 400 },
      );
    }
  }

  // Update proposed_updates status
  const nextStatus = action === "approved" && clearAfterApproval ? "boneyard" : action;
  const updateQ = admin
    .from("proposed_updates")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .in("id", targetIds);

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
    const approvalRecords = targetIds.map((id) => ({
      proposed_update_id: id,
      organization_id: ctx.orgId ?? targetIds[0],
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
              ? `${targetIds.length} update${targetIds.length !== 1 ? "s" : ""} approved`
              : `${targetIds.length} update${targetIds.length !== 1 ? "s" : ""} rejected`;
          const notifBody = comment
            ? `Comment: ${comment}`
            : `Status changed to ${action}`;

          const notifRows = orgUsers.flatMap((ou) =>
            targetIds.map((id) => ({
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
      const auditRows = targetIds.map((id) => ({
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

  return NextResponse.json({ ok: true, affected: targetIds.length, status: nextStatus });
}
