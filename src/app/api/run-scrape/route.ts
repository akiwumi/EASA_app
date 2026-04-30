import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import {
  ensureQueuedUpdatesForOrg,
  generateDraftsForOrg,
} from "@/lib/ai/proposed-updates";
import { aggregateRegChangesForOrg } from "@/lib/pipeline/aggregate-reg-changes";

type FunctionSuccess<T> = {
  ok: true;
  data: T | null;
};

type FunctionFailure = {
  ok: false;
  error: string;
};

async function invokeEdgeFunction<T>(name: string): Promise<FunctionSuccess<T> | FunctionFailure> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return { ok: false, error: "Supabase server credentials missing." };
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.functions.invoke(name);

  if (error) {
    const context = error as Error & {
      context?: {
        json?: () => Promise<Record<string, unknown>>;
        text?: () => Promise<string>;
        status?: number;
      };
    };

    let details = error.message;

    if (context.context?.json) {
      try {
        const payload = await context.context.json();
        details =
          (payload?.error as string | undefined) ??
          (payload?.message as string | undefined) ??
          details;
      } catch {
        // Fall through to text parsing.
      }
    }

    if (details === error.message && context.context?.text) {
      try {
        const text = (await context.context.text()).trim();
        if (text) details = text;
      } catch {
        // Keep the original SDK error message.
      }
    }

    return {
      ok: false,
      error: `${name}: ${details || `HTTP ${context.context?.status ?? 500}`}`,
    };
  }

  return { ok: true, data: (data as T | null) ?? null };
}

export async function POST() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase server credentials missing." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdminClient();
  const orgId = ctx.orgId;

  // --- Create pipeline_run row (status = running) ---
  const steps: Record<string, { status: string; started_at: string; finished_at?: string; error?: string }> = {};

  const { data: runRow } = await admin
    .from("pipeline_runs")
    .insert({
      organization_id: orgId,
      status: "running",
      started_at: new Date().toISOString(),
      steps: {},
      items_processed: 0,
      changes_found: 0,
    })
    .select("id")
    .maybeSingle();

  const runId: string | null = (runRow?.id as string | null) ?? null;

  async function updateRun(
    patch: Partial<{
      status: string;
      finished_at: string;
      steps: Record<string, unknown>;
      items_processed: number;
      changes_found: number;
      error_message: string;
    }>,
  ) {
    if (!runId) return;
    await admin.from("pipeline_runs").update(patch).eq("id", runId);
  }

  // ── Step 1: RSS ingest ──────────────────────────────────────────────────────
  const ingestStart = new Date().toISOString();
  steps["rss-ingest"] = { status: "running", started_at: ingestStart };
  await updateRun({ steps });

  const ingestResult = await invokeEdgeFunction<Record<string, unknown>>("rss-ingest");

  if (!ingestResult.ok) {
    steps["rss-ingest"] = { status: "error", started_at: ingestStart, finished_at: new Date().toISOString(), error: ingestResult.error };
    await updateRun({ status: "error", finished_at: new Date().toISOString(), steps, error_message: ingestResult.error });
    return NextResponse.json({ ok: false, error: ingestResult.error }, { status: 500 });
  }

  const ingestData = ingestResult.data;

  steps["rss-ingest"] = { status: "complete", started_at: ingestStart, finished_at: new Date().toISOString() };

  const itemsProcessed: number =
    typeof (ingestData as Record<string, unknown> | null)?.count === "number"
      ? (ingestData as Record<string, number>).count
      : 0;

  await updateRun({ steps, items_processed: itemsProcessed });

  // ── Step 2: AI analysis ─────────────────────────────────────────────────────
  let regulationData: {
    processed?: number;
    snapshotsCreated?: number;
    sectionsCreated?: number;
    embeddedSections?: number;
  } | null = null;
  const regulationStart = new Date().toISOString();
  steps["regulation-ingest"] = { status: "running", started_at: regulationStart };
  await updateRun({ steps });

  const regulationIngestResult = await invokeEdgeFunction<{
    processed?: number;
    snapshotsCreated?: number;
    sectionsCreated?: number;
    embeddedSections?: number;
  }>("regulation-ingest");

  if (!regulationIngestResult.ok) {
    steps["regulation-ingest"] = {
      status: "error",
      started_at: regulationStart,
      finished_at: new Date().toISOString(),
      error: regulationIngestResult.error,
    };
    await updateRun({ steps });
  } else {
    regulationData = regulationIngestResult.data ?? null;
    steps["regulation-ingest"] = {
      status: "complete",
      started_at: regulationStart,
      finished_at: new Date().toISOString(),
    };
    await updateRun({ steps });
  }

  // ── Step 3: AI analysis ─────────────────────────────────────────────────────
  const analyzeStart = new Date().toISOString();
  steps["ai-analyze"] = { status: "running", started_at: analyzeStart };
  await updateRun({ steps });

  const analyzeResult = await invokeEdgeFunction<Record<string, unknown>>("ai-analyze");

  if (!analyzeResult.ok) {
    steps["ai-analyze"] = { status: "error", started_at: analyzeStart, finished_at: new Date().toISOString(), error: analyzeResult.error };
    await updateRun({ status: "error", finished_at: new Date().toISOString(), steps, error_message: analyzeResult.error });
    return NextResponse.json({ ok: false, error: analyzeResult.error }, { status: 500 });
  }

  const analyzeData = analyzeResult.data;

  const analyzed: number =
    typeof (analyzeData as Record<string, unknown> | null)?.analyzed === "number"
      ? (analyzeData as Record<string, number>).analyzed
      : 0;

  steps["ai-analyze"] = { status: "complete", started_at: analyzeStart, finished_at: new Date().toISOString() };
  await updateRun({ steps, changes_found: analyzed });

  // ── Step 4: Aggregate reg_changes (best-effort) ─────────────────────────────
  let aggregateData: { created?: number } | null = null;
  const aggStart = new Date().toISOString();
  steps["aggregate"] = { status: "running", started_at: aggStart };
  await updateRun({ steps });

  try {
    const aggregateResult = await aggregateRegChangesForOrg(admin, orgId);
    if (!aggregateResult.ok) {
      steps["aggregate"] = {
        status: "error",
        started_at: aggStart,
        finished_at: new Date().toISOString(),
        error: aggregateResult.error,
      };
    } else {
      aggregateData = aggregateResult.payload;
      steps["aggregate"] = { status: "complete", started_at: aggStart, finished_at: new Date().toISOString() };
    }
  } catch {
    steps["aggregate"] = { status: "skipped", started_at: aggStart, finished_at: new Date().toISOString() };
  }

  await updateRun({ steps });

  // ── Step 5: Queue and draft flight book updates ────────────────────────────
  let queueData: { created?: number; linkedExisting?: number } | null = null;
  let draftData: { generated?: number; attempted?: number; errors?: { id: string; error: string }[] } | null = null;

  const queueStart = new Date().toISOString();
  steps["draft-updates"] = { status: "running", started_at: queueStart };
  await updateRun({ steps });

  const queueResult = await ensureQueuedUpdatesForOrg(admin, orgId);
  if (!queueResult.ok) {
    steps["draft-updates"] = {
      status: "error",
      started_at: queueStart,
      finished_at: new Date().toISOString(),
      error: queueResult.error,
    };
    await updateRun({ steps });
  } else {
    queueData = {
      created: queueResult.created,
      linkedExisting: queueResult.linkedExisting,
    };

    const draftsResult = await generateDraftsForOrg(admin, orgId, 20);
    if (!draftsResult.ok) {
      steps["draft-updates"] = {
        status: "error",
        started_at: queueStart,
        finished_at: new Date().toISOString(),
        error: draftsResult.error,
      };
    } else {
      draftData = {
        generated: draftsResult.generated,
        attempted: draftsResult.attempted,
        errors: draftsResult.errors,
      };
      steps["draft-updates"] = {
        status: draftsResult.errors.length > 0 ? "complete_with_errors" : "complete",
        started_at: queueStart,
        finished_at: new Date().toISOString(),
      };
    }
    await updateRun({ steps });
  }

  // ── Mark run complete ───────────────────────────────────────────────────────
  await updateRun({
    status: "complete",
    finished_at: new Date().toISOString(),
    steps,
    items_processed: itemsProcessed,
    changes_found: analyzed + (aggregateData?.created ?? 0),
  });

  return NextResponse.json({
    ok: true,
    runId,
    ingest: ingestData ?? null,
    regulationIngest: regulationData,
    analyze: analyzeData ?? null,
    aggregate: aggregateData ?? null,
    queue: queueData,
    drafts: draftData,
  });
}
