import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getOrgId(): Promise<string> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return DEFAULT_ORG_ID;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_ORG_ID;
  const admin = getAdminClient();
  const { data } = await admin
    .from("org_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data?.organization_id as string | null) ?? DEFAULT_ORG_ID;
}

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase server credentials missing." },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const orgId = await getOrgId();

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

  const supabase = createClient(url, serviceRoleKey);

  // ── Step 1: RSS ingest ──────────────────────────────────────────────────────
  const ingestStart = new Date().toISOString();
  steps["rss-ingest"] = { status: "running", started_at: ingestStart };
  await updateRun({ steps });

  const { data: ingestData, error: ingestError } = await supabase.functions.invoke("rss-ingest");

  if (ingestError) {
    steps["rss-ingest"] = { status: "error", started_at: ingestStart, finished_at: new Date().toISOString(), error: ingestError.message };
    await updateRun({ status: "error", finished_at: new Date().toISOString(), steps, error_message: ingestError.message });
    return NextResponse.json({ ok: false, error: ingestError.message }, { status: 500 });
  }

  steps["rss-ingest"] = { status: "complete", started_at: ingestStart, finished_at: new Date().toISOString() };

  const itemsProcessed: number =
    typeof (ingestData as Record<string, unknown> | null)?.count === "number"
      ? (ingestData as Record<string, number>).count
      : 0;

  await updateRun({ steps, items_processed: itemsProcessed });

  // ── Step 2: AI analysis ─────────────────────────────────────────────────────
  const analyzeStart = new Date().toISOString();
  steps["ai-analyze"] = { status: "running", started_at: analyzeStart };
  await updateRun({ steps });

  const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke("ai-analyze");

  if (analyzeError) {
    steps["ai-analyze"] = { status: "error", started_at: analyzeStart, finished_at: new Date().toISOString(), error: analyzeError.message };
    await updateRun({ status: "error", finished_at: new Date().toISOString(), steps, error_message: analyzeError.message });
    return NextResponse.json({ ok: false, error: analyzeError.message }, { status: 500 });
  }

  const analyzed: number =
    typeof (analyzeData as Record<string, unknown> | null)?.analyzed === "number"
      ? (analyzeData as Record<string, number>).analyzed
      : 0;

  steps["ai-analyze"] = { status: "complete", started_at: analyzeStart, finished_at: new Date().toISOString() };
  await updateRun({ steps, changes_found: analyzed });

  // ── Step 3: Aggregate reg_changes (best-effort) ─────────────────────────────
  let aggregateData: { created?: number } | null = null;
  const aggStart = new Date().toISOString();
  steps["aggregate"] = { status: "running", started_at: aggStart };
  await updateRun({ steps });

  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const aggRes = await fetch(`${origin}/api/pipeline/aggregate-reg-changes`, { method: "POST" });
    if (aggRes.ok) aggregateData = await aggRes.json();
    steps["aggregate"] = { status: "complete", started_at: aggStart, finished_at: new Date().toISOString() };
  } catch {
    steps["aggregate"] = { status: "skipped", started_at: aggStart, finished_at: new Date().toISOString() };
  }

  await updateRun({ steps });

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
    analyze: analyzeData ?? null,
    aggregate: aggregateData ?? null,
  });
}
