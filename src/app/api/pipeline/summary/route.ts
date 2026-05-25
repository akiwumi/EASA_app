import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

function summaryDismissCookieName(orgId: string, userId: string) {
  return `pipeline_summary_seen_${orgId}_${userId}`;
}

export async function GET() {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const cookieStore = await cookies();
  const cookieSeenRunId = cookieStore.get(summaryDismissCookieName(ctx.orgId, ctx.userId))?.value ?? null;
  const readState = ctx.userId
    ? await admin
        .from("org_ui_state")
        .select("pipeline_summary_seen_run_id")
        .eq("organization_id", ctx.orgId)
        .eq("user_id", ctx.userId)
        .maybeSingle()
    : { data: null as { pipeline_summary_seen_run_id?: string | null } | null, error: null };

  const { data: latestRun, error } = await admin
    .from("pipeline_runs")
    .select("id, status, started_at, finished_at, items_processed, changes_found, steps, error_message")
    .eq("organization_id", ctx.orgId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!latestRun) {
    return NextResponse.json({
      summary: "No scan has run yet for this organization.",
      status: null,
      createdAt: null,
      dismissed: false,
      runId: null,
    });
  }

  const startedAtIso = (latestRun.started_at as string | null) ?? null;
  const startedAt = startedAtIso ? new Date(startedAtIso).toLocaleString("en-GB") : null;
  const itemsProcessed = Number(latestRun.items_processed ?? 0);
  const changesFound = Number(latestRun.changes_found ?? 0);
  const runStatus = String(latestRun.status ?? "unknown").toLowerCase();
  const steps = (latestRun.steps as Record<string, unknown> | null) ?? null;
  const queueStats =
    (steps?.queue as { created?: number; linked_existing?: number } | null) ?? null;
  const dedup = (steps?.dedup as { skipped_known?: number; skipped_filtered?: number } | null) ?? null;
  const skippedKnown = Number(dedup?.skipped_known ?? 0);
  const skippedFiltered = Number(dedup?.skipped_filtered ?? 0);
  const addedToQueue = Number(queueStats?.created ?? 0);
  const linkedExisting = Number(queueStats?.linked_existing ?? 0);
  const plainError = String(latestRun.error_message ?? "").trim();
  const erroredStepEntry =
    steps
      ? Object.entries(steps).find(([, meta]) => {
          const status = String((meta as { status?: string } | null)?.status ?? "").toLowerCase();
          return status === "error";
        })
      : null;
  const erroredStep = erroredStepEntry?.[0] ?? null;
  const stepError = String(((erroredStepEntry?.[1] as { error?: string } | null)?.error ?? "")).trim();

  let summary: string[] = [];
  if (runStatus === "completed" || runStatus === "complete" || runStatus === "success") {
    summary = [
      `Scan completed ${startedAt ? `at ${startedAt}` : "recently"}`,
      `${itemsProcessed} source item${itemsProcessed === 1 ? "" : "s"} checked`,
      `${changesFound} new finding${changesFound === 1 ? "" : "s"} detected`,
      `${addedToQueue} added to your queue`,
      `${linkedExisting} already queued and linked`,
      `${skippedKnown} already known and skipped`,
      `${skippedFiltered} filtered by your school's exclusion rules`,
    ];
  } else if (runStatus === "running") {
    summary = ["A pipeline run is currently in progress."];
  } else if (runStatus === "error" || runStatus === "failed") {
    const errorDetail =
      stepError || plainError || "Unknown error";
    summary = [
      "Last pipeline run failed.",
      erroredStep
        ? `${erroredStep} encountered an error — ${errorDetail}`
        : `Pipeline encountered an error — ${errorDetail}`,
    ];
  } else {
    summary = ["Last pipeline status is available but not complete."];
  }

  const seenRunId = (readState.data?.pipeline_summary_seen_run_id as string | null) ?? null;
  const dismissed = seenRunId === latestRun.id || cookieSeenRunId === latestRun.id;

  return NextResponse.json({
    summaryLines: summary,
    summary: summary.join(". "),
    status: runStatus,
    createdAt: startedAt,
    createdAtIso: startedAtIso,
    runId: latestRun.id,
    dismissed,
    counts: {
      checked: itemsProcessed,
      findings: changesFound,
      addedToQueue,
      linkedExisting,
      skippedKnown,
      skippedFiltered,
    },
  });
}

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string; runId?: string | null };
  if (body.action !== "dismiss" || !body.runId) {
    return NextResponse.json({ error: "action=dismiss and runId are required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("org_ui_state")
    .upsert(
      {
        organization_id: ctx.orgId,
        user_id: ctx.userId,
        pipeline_summary_seen_run_id: body.runId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id" },
    );

  const response = NextResponse.json({ ok: true, persisted: !error });
  response.cookies.set(summaryDismissCookieName(ctx.orgId, ctx.userId), body.runId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
