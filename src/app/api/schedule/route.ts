import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

const DEFAULT_SCHEDULE = {
  cadence: "daily",
  runTimeUtc: "06:00",
  runsPerDay: 1,
  enabled: true,
  autoApproveLow: false,
  autoApproveDelayHours: 24,
  notifyOnDetect: true,
  defaultExportFmt: "pdf",
};

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
  const { data: orgUser } = await admin
    .from("org_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return (orgUser?.organization_id as string | null) ?? DEFAULT_ORG_ID;
}

function firstRunTimeUtc(row: { run_times_utc?: string[] | null; run_time_utc?: string | null }): string {
  const arr = row.run_times_utc;
  if (Array.isArray(arr) && arr.length > 0 && arr[0]) {
    const t = String(arr[0]);
    return t.length >= 5 ? t.slice(0, 5) : DEFAULT_SCHEDULE.runTimeUtc;
  }
  if (row.run_time_utc) return String(row.run_time_utc).slice(0, 5);
  return DEFAULT_SCHEDULE.runTimeUtc;
}

function buildRunTimesUtc(runTimeUtc: string, runsPerDay: number): string[] {
  const [hourText, minuteText] = runTimeUtc.split(":");
  const baseMinutes = Number(hourText) * 60 + Number(minuteText);
  const spacing = Math.floor((24 * 60) / runsPerDay);

  return Array.from({ length: runsPerDay }, (_, index) => {
    const totalMinutes = (baseMinutes + spacing * index) % (24 * 60);
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}:00`;
  });
}

export async function GET() {
  const orgId = await getOrgId();
  const admin = getAdminClient();

  const { data: schedule } = await admin
    .from("schedules")
    .select(
      "cadence, run_time_utc, run_times_utc, runs_per_day, enabled, auto_approve_low, auto_approve_delay_hours, notify_on_detect, default_export_fmt",
    )
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!schedule) {
    return NextResponse.json({ schedule: DEFAULT_SCHEDULE });
  }

  return NextResponse.json({
    schedule: {
      cadence: schedule.cadence ?? DEFAULT_SCHEDULE.cadence,
      runTimeUtc: firstRunTimeUtc(schedule),
      runsPerDay: Number(schedule.runs_per_day ?? DEFAULT_SCHEDULE.runsPerDay),
      enabled: schedule.enabled ?? DEFAULT_SCHEDULE.enabled,
      autoApproveLow:
        schedule.auto_approve_low ?? DEFAULT_SCHEDULE.autoApproveLow,
      autoApproveDelayHours:
        Number(schedule.auto_approve_delay_hours ?? DEFAULT_SCHEDULE.autoApproveDelayHours),
      notifyOnDetect:
        schedule.notify_on_detect ?? DEFAULT_SCHEDULE.notifyOnDetect,
      defaultExportFmt:
        schedule.default_export_fmt ?? DEFAULT_SCHEDULE.defaultExportFmt,
    },
  });
}

export async function POST(request: Request) {
  const orgId = await getOrgId();
  const admin = getAdminClient();

  const payload = (await request.json()) as {
    cadence?: string;
    runTimeUtc?: string;
    runsPerDay?: number;
    enabled?: boolean;
    autoApproveLow?: boolean;
    autoApproveDelayHours?: number;
    notifyOnDetect?: boolean;
    defaultExportFmt?: string;
  };

  const runTimeUtc = payload.runTimeUtc ?? DEFAULT_SCHEDULE.runTimeUtc;
  const timeForDb = runTimeUtc.length === 5 ? `${runTimeUtc}:00` : runTimeUtc;
  const runsPerDay = Math.min(4, Math.max(1, Number(payload.runsPerDay ?? DEFAULT_SCHEDULE.runsPerDay)));

  const body = {
    cadence: payload.cadence ?? DEFAULT_SCHEDULE.cadence,
    run_time_utc: timeForDb,
    runs_per_day: runsPerDay,
    run_times_utc: buildRunTimesUtc(runTimeUtc, runsPerDay),
    enabled: payload.enabled ?? DEFAULT_SCHEDULE.enabled,
    auto_approve_low:
      payload.autoApproveLow ?? DEFAULT_SCHEDULE.autoApproveLow,
    auto_approve_delay_hours: Math.min(
      168,
      Math.max(
        1,
        Number(
          payload.autoApproveDelayHours ??
            DEFAULT_SCHEDULE.autoApproveDelayHours,
        ) || DEFAULT_SCHEDULE.autoApproveDelayHours,
      ),
    ),
    notify_on_detect:
      payload.notifyOnDetect ?? DEFAULT_SCHEDULE.notifyOnDetect,
    default_export_fmt:
      payload.defaultExportFmt === "docx" ? "docx" : "pdf",
    updated_at: new Date().toISOString(),
  };

  // Manual upsert: update if row exists, otherwise insert
  const { data: existing } = await admin
    .from("schedules")
    .select("id")
    .eq("organization_id", orgId)
    .maybeSingle();

  const { error } = existing
    ? await admin.from("schedules").update(body).eq("organization_id", orgId)
    : await admin.from("schedules").insert({ ...body, organization_id: orgId });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
