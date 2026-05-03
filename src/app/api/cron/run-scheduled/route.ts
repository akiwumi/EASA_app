import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/access";
import { runPipelineForOrganization } from "@/lib/pipeline/run-org-pipeline";

type ScheduleRow = {
  organization_id: string;
  enabled: boolean | null;
  run_times_utc: string[] | null;
  run_time_utc: string | null;
  notify_on_detect: boolean | null;
};

function authorized(request: Request) {
  const secret = process.env.SCHEDULED_PIPELINE_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function normalizeRunTimes(row: ScheduleRow) {
  if (Array.isArray(row.run_times_utc) && row.run_times_utc.length > 0) {
    return row.run_times_utc.map((value) => String(value).slice(0, 5));
  }
  if (row.run_time_utc) return [String(row.run_time_utc).slice(0, 5)];
  return [];
}

function currentUtcTime(now: Date) {
  return `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
}

function scheduledWindowStart(now: Date, hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0, 0));
  return start;
}

async function orgAlreadyRanSince(admin: ReturnType<typeof getSupabaseAdminClient>, orgId: string, sinceIso: string) {
  const { data } = await admin
    .from("pipeline_runs")
    .select("id, started_at")
    .eq("organization_id", orgId)
    .gte("started_at", sinceIso)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  const now = new Date();
  const nowUtc = currentUtcTime(now);

  const { data: schedules, error } = await admin
    .from("schedules")
    .select("organization_id, enabled, run_times_utc, run_time_utc, notify_on_detect")
    .eq("enabled", true);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const dueSchedules: Array<{ organization_id: string; notify_on_detect: boolean | null; slot: string }> = [];

  for (const row of (schedules ?? []) as ScheduleRow[]) {
    const runTimes = normalizeRunTimes(row);
    for (const slot of runTimes) {
      if (slot !== nowUtc) continue;
      const since = scheduledWindowStart(now, slot).toISOString();
      const alreadyRan = await orgAlreadyRanSince(admin, row.organization_id, since);
      if (!alreadyRan) {
        dueSchedules.push({
          organization_id: row.organization_id,
          notify_on_detect: row.notify_on_detect,
          slot,
        });
      }
    }
  }

  const results = [];
  for (const schedule of dueSchedules) {
    const result = await runPipelineForOrganization(admin, schedule.organization_id, {
      notifyAdmins: schedule.notify_on_detect ?? true,
      runLabel: `Scheduled scan at ${schedule.slot} UTC`,
    });
    results.push({
      organizationId: schedule.organization_id,
      slot: schedule.slot,
      ok: result.ok,
      updateCount: result.updateCount ?? 0,
      error: result.error ?? null,
      runId: result.runId,
    });
  }

  return NextResponse.json({
    ok: true,
    checkedAtUtc: now.toISOString(),
    dueCount: dueSchedules.length,
    results,
  });
}
