import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ensureQueuedUpdatesForOrg,
  generateDraftsForOrg,
} from "@/lib/ai/proposed-updates";
import { enrichRssItemEmbeddings } from "@/lib/ai/embeddings";
import { aggregateRegChangesForOrg } from "@/lib/pipeline/aggregate-reg-changes";

type FunctionSuccess<T> = {
  ok: true;
  data: T | null;
};

type FunctionFailure = {
  ok: false;
  error: string;
};

export type PipelineExecutionResult = {
  ok: boolean;
  runId: string | null;
  error?: string;
  ingest?: Record<string, unknown> | null;
  regulationIngest?: {
    processed?: number;
    snapshotsCreated?: number;
    sectionsCreated?: number;
    embeddedSections?: number;
  } | null;
  analyze?: Record<string, unknown> | null;
  aggregate?: { created?: number } | null;
  queue?: { created?: number; linkedExisting?: number } | null;
  drafts?: { generated?: number; attempted?: number; errors?: { id: string; error: string }[] } | null;
  itemsProcessed?: number;
  changesFound?: number;
  updateCount?: number;
};

export function normalizePipelineError(error: string) {
  if (/supabase server credentials missing/i.test(error)) {
    return "Supabase server credentials are missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the pipeline.";
  }

  if (/failed to send a request to the edge function/i.test(error)) {
    return "Supabase Edge Functions are unreachable. Deploy or start the project functions before running the pipeline.";
  }

  if (/non-2xx status code/i.test(error) && /functions\/v1\//i.test(error)) {
    return "A Supabase Edge Function returned an error. Check the function logs for rss-ingest, regulation-ingest, or ai-analyze.";
  }

  if (/function.+not found/i.test(error) || /not found/i.test(error) && /rss-ingest|regulation-ingest|ai-analyze/i.test(error)) {
    return "One or more required Supabase Edge Functions are not deployed yet. Deploy rss-ingest, regulation-ingest, and ai-analyze first.";
  }

  return error;
}

async function invokeEdgeFunction<T>(
  name: string,
  body?: Record<string, unknown>,
): Promise<FunctionSuccess<T> | FunctionFailure> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return { ok: false, error: "Supabase server credentials missing." };
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });

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

async function insertAdminPipelineNotification(
  admin: SupabaseClient,
  orgId: string,
  title: string,
  body: string,
  runId: string | null,
) {
  const { data: admins } = await admin
    .from("org_users")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "admin");

  if (!admins?.length) return;

  await admin.from("notifications").insert(
    admins.map((member) => ({
      organization_id: orgId,
      user_id: member.user_id,
      type: "pipeline_summary",
      title,
      body,
      related_entity_type: "pipeline_run",
      related_entity_id: runId,
    })),
  );
}

export async function runPipelineForOrganization(
  admin: SupabaseClient,
  orgId: string,
  options?: { notifyAdmins?: boolean; runLabel?: string },
): Promise<PipelineExecutionResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return {
      ok: false,
      runId: null,
      error: normalizePipelineError("Supabase server credentials missing."),
    };
  }

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

  try {
    const functionArgs = { organizationId: orgId };

    const ingestStart = new Date().toISOString();
    steps["rss-ingest"] = { status: "running", started_at: ingestStart };
    await updateRun({ steps });

    const ingestResult = await invokeEdgeFunction<Record<string, unknown>>("rss-ingest", functionArgs);
    if (!ingestResult.ok) {
      const error = normalizePipelineError(ingestResult.error);
      steps["rss-ingest"] = { status: "error", started_at: ingestStart, finished_at: new Date().toISOString(), error };
      await updateRun({ status: "error", finished_at: new Date().toISOString(), steps, error_message: error });
      if (options?.notifyAdmins) {
        await insertAdminPipelineNotification(
          admin,
          orgId,
          "Scheduled scan failed",
          `The scheduled RSS and flight book scan could not complete. ${error}`,
          runId,
        );
      }
      return { ok: false, runId, error };
    }

    const ingestData = ingestResult.data;
    steps["rss-ingest"] = { status: "complete", started_at: ingestStart, finished_at: new Date().toISOString() };

    const itemsProcessed =
      typeof (ingestData as Record<string, unknown> | null)?.count === "number"
        ? (ingestData as Record<string, number>).count
        : 0;

    await updateRun({ steps, items_processed: itemsProcessed });

    try {
      const { data: unembedded } = await admin
        .from("rss_items")
        .select("id, organization_id, title, summary, category")
        .eq("organization_id", orgId)
        .is("embedding", null)
        .limit(50);

      if (unembedded && unembedded.length > 0) {
        await enrichRssItemEmbeddings(admin, unembedded as Parameters<typeof enrichRssItemEmbeddings>[1]);
      }
    } catch {
      // best-effort only
    }

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
    }>("regulation-ingest", functionArgs);

    if (!regulationIngestResult.ok) {
      steps["regulation-ingest"] = {
        status: "error",
        started_at: regulationStart,
        finished_at: new Date().toISOString(),
        error: normalizePipelineError(regulationIngestResult.error),
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

    const analyzeStart = new Date().toISOString();
    steps["ai-analyze"] = { status: "running", started_at: analyzeStart };
    await updateRun({ steps });

    const analyzeResult = await invokeEdgeFunction<Record<string, unknown>>("ai-analyze", functionArgs);
    if (!analyzeResult.ok) {
      const error = normalizePipelineError(analyzeResult.error);
      steps["ai-analyze"] = { status: "error", started_at: analyzeStart, finished_at: new Date().toISOString(), error };
      await updateRun({ status: "error", finished_at: new Date().toISOString(), steps, error_message: error });
      if (options?.notifyAdmins) {
        await insertAdminPipelineNotification(
          admin,
          orgId,
          "Scheduled scan failed",
          `The scheduled AI comparison of RSS changes against flight books could not complete. ${error}`,
          runId,
        );
      }
      return { ok: false, runId, error };
    }

    const analyzeData = analyzeResult.data;
    const analyzed =
      typeof (analyzeData as Record<string, unknown> | null)?.analyzed === "number"
        ? (analyzeData as Record<string, number>).analyzed
        : 0;

    steps["ai-analyze"] = { status: "complete", started_at: analyzeStart, finished_at: new Date().toISOString() };
    await updateRun({ steps, changes_found: analyzed });

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

    const updateCount = (queueData?.created ?? 0) + (queueData?.linkedExisting ?? 0);
    const changesFound = analyzed + (aggregateData?.created ?? 0);

    await updateRun({
      status: "complete",
      finished_at: new Date().toISOString(),
      steps,
      items_processed: itemsProcessed,
      changes_found: changesFound,
    });

    if (options?.notifyAdmins) {
      if (updateCount > 0) {
        await insertAdminPipelineNotification(
          admin,
          orgId,
          "Flight books need review",
          `${options.runLabel ?? "Scheduled scan"} found ${updateCount} flight book update candidate${updateCount === 1 ? "" : "s"} from the latest RSS and regulation scan.`,
          runId,
        );
      } else {
        await insertAdminPipelineNotification(
          admin,
          orgId,
          "No flight book updates needed",
          `${options.runLabel ?? "Scheduled scan"} completed. RSS sources and flight books were checked, and no update is needed right now.`,
          runId,
        );
      }
    }

    return {
      ok: true,
      runId,
      ingest: ingestData ?? null,
      regulationIngest: regulationData,
      analyze: analyzeData ?? null,
      aggregate: aggregateData ?? null,
      queue: queueData,
      drafts: draftData,
      itemsProcessed,
      changesFound,
      updateCount,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected pipeline error.";
    const normalized = normalizePipelineError(message);
    if (options?.notifyAdmins) {
      await insertAdminPipelineNotification(
        admin,
        orgId,
        "Scheduled scan failed",
        normalized,
        runId,
      );
    }
    return { ok: false, runId, error: normalized };
  }
}
