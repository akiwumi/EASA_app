import {
  DEFAULT_ORG_NAME,
  getOrgAccessContext,
  getSupabaseAdminClient,
} from "@/lib/supabase/access";
import { seedDefaultSources } from "@/lib/seed-default-sources";
import { sourceDisplayName } from "@/lib/source-labels";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type OrgContext = {
  organizationId: string;
  organizationName: string;
  role: string;
  userId: string;
};

export type DashboardStats = {
  newChanges7d: number;
  pendingApprovals: number;
  approvedThisWeek: number;
  sourcesTotal: number;
  sourcesActive: number;
};

export type QueuePreviewItem = {
  id: string;
  title: string;
  risk: string;
  confidence: string;
  status: string;
  summary: string;
  classification: string;
};

export type FlightbookMappingRow = {
  id: string;
  name: string;
  mappedSections: number;
  totalSections: number;
};

export type PipelinePreview = {
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  steps: Record<string, unknown> | null;
};

export type DashboardSetupSummary = {
  hasAiConfig: boolean;
  hasAiKey: boolean;
  hasSchedule: boolean;
  hasFlightbooks: boolean;
  flightbookCount: number;
  rssSourceCount: number;
  activeRssCount: number;
};

export type DashboardOperationalStats = {
  unreadCriticalUpdates: number;
  studentsPendingAcknowledgement: number;
  instructorsPendingSignoff: number;
  lessonsAffectedByRecentChanges: number;
  newestProposedUpdates: number;
};

export type AffectedLessonPreview = {
  lessonId: string;
  lessonCode: string | null;
  title: string;
  impactCount: number;
};

export type DashboardRoleFocus = {
  myAssignmentsOpen: number;
  myPendingAcknowledgements: number;
  myPendingInstructorSignoffs: number;
  orgPendingApprovals: number;
};

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

function formatUtc(ts: string | null | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return "—";
  }
}

function riskLabel(level: string | null | undefined): string {
  const v = (level ?? "medium").toLowerCase();
  if (v === "high") return "High";
  if (v === "low") return "Low";
  return "Medium";
}

export async function loadOrgContext(): Promise<OrgContext | null> {
  const ctx = await getOrgAccessContext();
  if (!ctx) return null;

  const admin = getSupabaseAdminClient();
  const { data: row } = await admin
    .from("organizations")
    .select("name")
    .eq("id", ctx.orgId)
    .maybeSingle();

  return {
    organizationId: ctx.orgId,
    organizationName: (row?.name as string | null) ?? DEFAULT_ORG_NAME,
    role: ctx.role,
    userId: ctx.userId,
  };
}

export async function loadDashboardStats(
  organizationId: string,
): Promise<DashboardStats> {
  const admin = getSupabaseAdminClient();

  const weekStartUtc = new Date();
  weekStartUtc.setUTCHours(0, 0, 0, 0);
  weekStartUtc.setUTCDate(weekStartUtc.getUTCDate() - ((weekStartUtc.getUTCDay() + 6) % 7));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: newChanges7d, error: regChangesError },
    { count: pendingApprovals, error: pendingError },
    { data: approvedUpdates, error: approvedUpdatesError },
    { count: sourcesTotal, error: sourcesTotalError },
    { count: sourcesActive, error: sourcesActiveError },
  ] = await Promise.all([
    admin
      .from("reg_changes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("detected_at", sevenDaysAgo),
    admin
      .from("proposed_updates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    admin
      .from("proposed_updates")
      .select("id")
      .eq("organization_id", organizationId),
    admin
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("type", "rss")
      .eq("organization_id", organizationId),
    admin
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("type", "rss")
      .eq("organization_id", organizationId)
      .eq("active", true),
  ]);

  if (
    regChangesError ||
    pendingError ||
    approvedUpdatesError ||
    sourcesTotalError ||
    sourcesActiveError
  ) {
    return {
      newChanges7d: 0,
      pendingApprovals: 0,
      approvedThisWeek: 0,
      sourcesTotal: 0,
      sourcesActive: 0,
    };
  }

  const proposedUpdateIds = (approvedUpdates ?? []).map((row) => row.id as string);
  const { count: approvedThisWeek } = proposedUpdateIds.length
    ? await admin
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .in("proposed_update_id", proposedUpdateIds)
        .in("action", ["approved", "auto_approved"])
        .gte("decided_at", weekStartUtc.toISOString())
    : { count: 0 };

  return {
    newChanges7d: Number(newChanges7d ?? 0),
    pendingApprovals: Number(pendingApprovals ?? 0),
    approvedThisWeek: Number(approvedThisWeek ?? 0),
    sourcesTotal: Number(sourcesTotal ?? 0),
    sourcesActive: Number(sourcesActive ?? 0),
  };
}

export async function loadUpdateQueuePreview(
  organizationId: string,
  limit = 5,
): Promise<QueuePreviewItem[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("v_update_queue")
    .select(
      "id, risk_level, confidence_score, status, ai_rationale, classification, reg_section_ref, flightbook_section_title, regulation_part, change_type",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    return [];
  }

  return data.map((row) => {
    const titleParts = [
      row.regulation_part,
      row.reg_section_ref,
      row.flightbook_section_title,
    ].filter(Boolean);
    const title =
      titleParts.length > 0
        ? titleParts.join(" · ")
        : "Regulation update";

    const conf =
      row.confidence_score != null
        ? `${Math.round(Number(row.confidence_score))}%`
        : "—";

    return {
      id: row.id,
      title,
      risk: riskLabel(row.risk_level),
      confidence: conf,
      status: row.status ?? "pending",
      summary:
        row.ai_rationale ??
        (row.change_type
          ? `Change type: ${row.change_type}`
          : "Awaiting review."),
      classification: row.classification ?? "watchlist",
    };
  });
}

export type RssSourceRow = { url: string; name: string; active: boolean };

export async function loadRssSourceUrls(organizationId: string): Promise<RssSourceRow[]> {
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("sources")
    .select("url, active")
    .eq("type", "rss")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []).map((s) => ({
    url: s.url as string,
    name: sourceDisplayName(s.url as string),
    active: s.active as boolean,
  }));
}

export async function loadLastRssIngestAt(
  organizationId: string,
): Promise<string | null> {
  const admin = getSupabaseAdminClient();

  const { data } = await admin
    .from("rss_items")
    .select("created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.created_at ?? null;
}

export async function loadFlightbookMappingRows(
  organizationId: string,
): Promise<FlightbookMappingRow[]> {
  const admin = getSupabaseAdminClient();

  const { data: books, error: booksError } = await admin
    .from("flightbooks")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name");

  if (booksError) return [];
  if (!books?.length) return [];

  const rows: FlightbookMappingRow[] = [];

  for (const book of books) {
    const { data: sections } = await admin
      .from("flightbook_sections")
      .select("id")
      .eq("flightbook_id", book.id);

    const sectionIds = (sections ?? []).map((s) => s.id);
    let mapped = 0;
    if (sectionIds.length) {
      const { count } = await admin
        .from("flightbook_mappings")
        .select("id", { count: "exact", head: true })
        .in("flightbook_section_id", sectionIds);
      mapped = count ?? 0;
    }

    rows.push({
      id: book.id,
      name: book.name as string,
      mappedSections: mapped,
      totalSections: sectionIds.length,
    });
  }

  return rows;
}

export async function loadRiskMix(organizationId: string): Promise<{
  high: number;
  medium: number;
  low: number;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { high: 0, medium: 0, low: 0 };

  const { data } = await supabase
    .from("proposed_updates")
    .select("risk_level")
    .eq("organization_id", organizationId)
    .neq("status", "rejected");

  const mix = { high: 0, medium: 0, low: 0 };
  for (const row of data ?? []) {
    const r = String(row.risk_level ?? "medium").toLowerCase();
    if (r === "high") mix.high += 1;
    else if (r === "low") mix.low += 1;
    else mix.medium += 1;
  }
  return mix;
}

export async function loadRecentPipelineRun(
  organizationId: string,
): Promise<PipelinePreview | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("pipeline_runs")
    .select("status, started_at, finished_at, steps")
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    status: data.status as string,
    startedAt: data.started_at as string | null,
    finishedAt: data.finished_at as string | null,
    steps: (data.steps as Record<string, unknown> | null) ?? null,
  };
}

export async function loadRecentSectionVersions(
  organizationId: string,
  limit = 3,
): Promise<{ at: string; note: string }[]> {
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("flightbook_section_versions")
    .select("created_at, change_source, version_number")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    console.error("Failed to load recent flightbook section versions", error);
    return [];
  }

  return (data ?? []).map((v) => ({
    at: formatUtc(v.created_at as string),
    note: `${v.change_source as string} · v${v.version_number}`,
  }));
}

export async function loadDashboardSetupSummary(
  organizationId: string,
): Promise<DashboardSetupSummary> {
  const admin = getSupabaseAdminClient();

  if (!organizationId) {
    return {
      hasAiConfig: false,
      hasAiKey: false,
      hasSchedule: false,
      hasFlightbooks: false,
      flightbookCount: 0,
      rssSourceCount: 0,
      activeRssCount: 0,
    };
  }

  async function countRssSources(activeOnly: boolean) {
    let query = admin
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("type", "rss")
      .or(`organization_id.eq.${organizationId},organization_id.is.null`);

    if (activeOnly) query = query.eq("active", true);
    return query;
  }

  const [
    { data: aiConfig, error: aiError },
    { data: schedule, error: scheduleError },
    { count: flightbookCount, error: booksError },
    initialRssSourceResult,
    initialActiveRssResult,
  ] = await Promise.all([
    admin
      .from("ai_provider_config")
      .select("provider, api_key")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin
      .from("schedules")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin
      .from("flightbooks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("active", true),
    countRssSources(false),
    countRssSources(true),
  ]);

  let rssSourceResult = initialRssSourceResult;
  let activeRssResult = initialActiveRssResult;

  if (!activeRssResult.error && (activeRssResult.count ?? 0) === 0) {
    await seedDefaultSources(organizationId);
    [rssSourceResult, activeRssResult] = await Promise.all([
      countRssSources(false),
      countRssSources(true),
    ]);
  }

  const { count: rssSourceCount, error: rssError } = rssSourceResult;
  const { count: activeRssCount, error: activeRssError } = activeRssResult;

  return {
    hasAiConfig: !aiError && Boolean(aiConfig),
    hasAiKey: !aiError && Boolean(aiConfig?.api_key),
    hasSchedule:
      !scheduleError && !isMissingSchemaError(scheduleError ?? {}) && Boolean(schedule),
    hasFlightbooks:
      !booksError && !isMissingSchemaError(booksError ?? {}) && (flightbookCount ?? 0) > 0,
    flightbookCount:
      !booksError && !isMissingSchemaError(booksError ?? {}) ? flightbookCount ?? 0 : 0,
    rssSourceCount:
      !rssError && !isMissingSchemaError(rssError ?? {}) ? rssSourceCount ?? 0 : 0,
    activeRssCount:
      !activeRssError && !isMissingSchemaError(activeRssError ?? {}) ? activeRssCount ?? 0 : 0,
  };
}

export async function loadDashboardOperationalStats(
  organizationId: string,
  userId: string,
): Promise<DashboardOperationalStats> {
  const admin = getSupabaseAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: unreadCriticalUpdates, error: notificationsError },
    { count: studentsPendingAcknowledgement, error: acknowledgementsError },
    { count: instructorsPendingSignoff, error: signoffsError },
    { count: newestProposedUpdates, error: updatesError },
  ] = await Promise.all([
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .in("type", ["new_change", "approval_needed"]),
    admin
      .from("acknowledgements")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    admin
      .from("training_signoffs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    admin
      .from("proposed_updates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", sevenDaysAgo),
  ]);

  const lessonsAffectedByRecentChanges = await loadAffectedLessonCount(organizationId);

  return {
    unreadCriticalUpdates:
      !notificationsError && !isMissingSchemaError(notificationsError ?? {}) ? Number(unreadCriticalUpdates ?? 0) : 0,
    studentsPendingAcknowledgement:
      !acknowledgementsError && !isMissingSchemaError(acknowledgementsError ?? {}) ? Number(studentsPendingAcknowledgement ?? 0) : 0,
    instructorsPendingSignoff:
      !signoffsError && !isMissingSchemaError(signoffsError ?? {}) ? Number(instructorsPendingSignoff ?? 0) : 0,
    lessonsAffectedByRecentChanges,
    newestProposedUpdates:
      !updatesError && !isMissingSchemaError(updatesError ?? {}) ? Number(newestProposedUpdates ?? 0) : 0,
  };
}

async function loadAffectedLessonCount(organizationId: string): Promise<number> {
  const lessons = await loadAffectedLessonsPreview(organizationId, 200);
  return lessons.length;
}

export async function loadAffectedLessonsPreview(
  organizationId: string,
  limit = 5,
): Promise<AffectedLessonPreview[]> {
  const admin = getSupabaseAdminClient();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: updates, error: updatesError } = await admin
    .from("proposed_updates")
    .select("flightbook_section_id")
    .eq("organization_id", organizationId)
    .gte("created_at", fourteenDaysAgo)
    .not("flightbook_section_id", "is", null);

  if (updatesError && isMissingSchemaError(updatesError)) return [];
  const sectionIds = Array.from(new Set((updates ?? []).map((row) => row.flightbook_section_id).filter(Boolean))) as string[];
  if (sectionIds.length === 0) return [];

  const { data: lessonDocuments, error: docsError } = await admin
    .from("lesson_documents")
    .select("lesson_id, flightbook_section_id")
    .eq("organization_id", organizationId)
    .in("flightbook_section_id", sectionIds);

  if (docsError && isMissingSchemaError(docsError)) return [];

  const lessonIds = Array.from(new Set((lessonDocuments ?? []).map((row) => row.lesson_id).filter(Boolean))) as string[];
  if (lessonIds.length === 0) return [];

  const { data: lessons, error: lessonsError } = await admin
    .from("training_lessons")
    .select("id, title, lesson_code")
    .eq("organization_id", organizationId)
    .in("id", lessonIds);

  if (lessonsError && isMissingSchemaError(lessonsError)) return [];

  const impactMap = new Map<string, number>();
  for (const row of lessonDocuments ?? []) {
    if (!row.lesson_id) continue;
    impactMap.set(row.lesson_id, (impactMap.get(row.lesson_id) ?? 0) + 1);
  }

  return (lessons ?? [])
    .map((lesson) => ({
      lessonId: lesson.id as string,
      lessonCode: (lesson.lesson_code as string | null) ?? null,
      title: lesson.title as string,
      impactCount: impactMap.get(lesson.id as string) ?? 0,
    }))
    .sort((a, b) => b.impactCount - a.impactCount || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export async function loadDashboardRoleFocus(
  organizationId: string,
  userId: string,
): Promise<DashboardRoleFocus> {
  const admin = getSupabaseAdminClient();

  const [
    { count: myAssignmentsOpen, error: assignmentsError },
    { count: myPendingAcknowledgements, error: acknowledgementsError },
    { count: myPendingInstructorSignoffs, error: signoffsError },
    { count: orgPendingApprovals, error: approvalsError },
  ] = await Promise.all([
    admin
      .from("document_assignments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("status", "assigned"),
    admin
      .from("acknowledgements")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("status", "pending"),
    admin
      .from("training_signoffs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("instructor_user_id", userId)
      .eq("status", "pending"),
    admin
      .from("proposed_updates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
  ]);

  return {
    myAssignmentsOpen:
      !assignmentsError && !isMissingSchemaError(assignmentsError ?? {}) ? Number(myAssignmentsOpen ?? 0) : 0,
    myPendingAcknowledgements:
      !acknowledgementsError && !isMissingSchemaError(acknowledgementsError ?? {}) ? Number(myPendingAcknowledgements ?? 0) : 0,
    myPendingInstructorSignoffs:
      !signoffsError && !isMissingSchemaError(signoffsError ?? {}) ? Number(myPendingInstructorSignoffs ?? 0) : 0,
    orgPendingApprovals:
      !approvalsError && !isMissingSchemaError(approvalsError ?? {}) ? Number(orgPendingApprovals ?? 0) : 0,
  };
}

export function pipelineHealthLabel(status: string | null | undefined): {
  value: string;
  trend: string;
  tone: "blue" | "orange" | "red" | "green";
} {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "completed" || normalized === "success") {
    return { value: "Healthy", trend: "Latest run completed", tone: "green" };
  }
  if (normalized === "running") {
    return { value: "Running", trend: "Pipeline in progress", tone: "blue" };
  }
  if (normalized === "failed" || normalized === "error") {
    return { value: "Attention", trend: "Latest run failed", tone: "red" };
  }
  return { value: "Idle", trend: "No current run", tone: "orange" };
}

export function sourcesHealthLabel(active: number, total: number): {
  value: string;
  trend: string;
  tone: "blue" | "orange" | "red" | "green";
} {
  if (total === 0) {
    return { value: "—", trend: "No sources configured", tone: "orange" };
  }
  if (active === total) {
    return {
      value: `${active}/${total}`,
      trend: "All sources active",
      tone: "green",
    };
  }
  return {
    value: `${active}/${total}`,
    trend: `${total - active} disabled`,
    tone: "red",
  };
}
