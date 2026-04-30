import {
  DEFAULT_ORG_NAME,
  getOrgAccessContext,
  getSupabaseAdminClient,
} from "@/lib/supabase/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type OrgContext = {
  organizationId: string;
  organizationName: string;
  role: string;
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
  };
}

export async function loadDashboardStats(
  organizationId: string,
): Promise<DashboardStats> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      newChanges7d: 0,
      pendingApprovals: 0,
      approvedThisWeek: 0,
      sourcesTotal: 0,
      sourcesActive: 0,
    };
  }

  const { data, error } = await supabase
    .from("v_dashboard_stats")
    .select(
      "new_changes_7d, pending_approvals, approved_this_week, sources_total, sources_active",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return {
      newChanges7d: 0,
      pendingApprovals: 0,
      approvedThisWeek: 0,
      sourcesTotal: 0,
      sourcesActive: 0,
    };
  }

  return {
    newChanges7d: Number(data.new_changes_7d ?? 0),
    pendingApprovals: Number(data.pending_approvals ?? 0),
    approvedThisWeek: Number(data.approved_this_week ?? 0),
    sourcesTotal: Number(data.sources_total ?? 0),
    sourcesActive: Number(data.sources_active ?? 0),
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

export type RssSourceRow = { url: string; active: boolean };

export async function loadRssSourceUrls(organizationId: string): Promise<RssSourceRow[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("sources")
    .select("url, active")
    .eq("type", "rss")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []).map((s) => ({ url: s.url as string, active: s.active as boolean }));
}

export async function loadLastRssIngestAt(
  organizationId: string,
): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
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
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data: books, error: booksError } = await supabase
    .from("flightbooks")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name");

  if (booksError) return [];
  if (!books?.length) return [];

  const rows: FlightbookMappingRow[] = [];

  for (const book of books) {
    const { data: sections } = await supabase
      .from("flightbook_sections")
      .select("id")
      .eq("flightbook_id", book.id);

    const sectionIds = (sections ?? []).map((s) => s.id);
    let mapped = 0;
    if (sectionIds.length) {
      const { count } = await supabase
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
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("flightbook_section_versions")
    .select("created_at, change_source, version_number")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((v) => ({
    at: formatUtc(v.created_at as string),
    note: `${v.change_source as string} · v${v.version_number}`,
  }));
}

export async function loadDashboardSetupSummary(
  organizationId: string,
): Promise<DashboardSetupSummary> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      hasAiConfig: false,
      hasAiKey: false,
      hasSchedule: false,
      hasFlightbooks: false,
      flightbookCount: 0,
    };
  }

  const [
    { data: aiConfig, error: aiError },
    { data: schedule, error: scheduleError },
    { count: flightbookCount, error: booksError },
  ] = await Promise.all([
    supabase
      .from("ai_provider_config")
      .select("provider, api_key")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("schedules")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("flightbooks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("active", true),
  ]);

  return {
    hasAiConfig: !aiError && Boolean(aiConfig),
    hasAiKey: !aiError && Boolean(aiConfig?.api_key),
    hasSchedule:
      !scheduleError && !isMissingSchemaError(scheduleError ?? {}) && Boolean(schedule),
    hasFlightbooks:
      !booksError && !isMissingSchemaError(booksError ?? {}) && (flightbookCount ?? 0) > 0,
    flightbookCount:
      !booksError && !isMissingSchemaError(booksError ?? {}) ? flightbookCount ?? 0 : 0,
  };
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
