import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_SCHEDULE = {
  cadence: "daily",
  runTimeUtc: "06:00",
  runsPerDay: 1,
  enabled: true,
};

function firstRunTimeUtc(row: {
  run_times_utc?: string[] | null;
  run_time_utc?: string | null;
}): string {
  const arr = row.run_times_utc;
  if (Array.isArray(arr) && arr.length > 0 && arr[0]) {
    const t = String(arr[0]);
    return t.length >= 5 ? t.slice(0, 5) : DEFAULT_SCHEDULE.runTimeUtc;
  }
  if (row.run_time_utc) {
    return String(row.run_time_utc).slice(0, 5);
  }
  return DEFAULT_SCHEDULE.runTimeUtc;
}

export async function GET() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ schedule: DEFAULT_SCHEDULE }, { status: 200 });
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ schedule: DEFAULT_SCHEDULE }, { status: 200 });
  }

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("organization_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!orgUser?.organization_id) {
    return NextResponse.json({ schedule: DEFAULT_SCHEDULE }, { status: 200 });
  }

  const { data: schedule } = await supabase
    .from("schedules")
    .select("cadence, run_time_utc, run_times_utc, runs_per_day, enabled")
    .eq("organization_id", orgUser.organization_id)
    .maybeSingle();

  if (!schedule) {
    return NextResponse.json({ schedule: DEFAULT_SCHEDULE }, { status: 200 });
  }

  return NextResponse.json(
    {
      schedule: {
        cadence: schedule.cadence,
        runTimeUtc: firstRunTimeUtc(schedule),
        runsPerDay: Number(schedule.runs_per_day ?? DEFAULT_SCHEDULE.runsPerDay),
        enabled: schedule.enabled,
      },
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured." },
      { status: 400 },
    );
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  const payload = (await request.json()) as {
    cadence?: string;
    runTimeUtc?: string;
    runsPerDay?: number;
    enabled?: boolean;
  };

  const { data: orgUser } = await supabase
    .from("org_users")
    .select("organization_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!orgUser?.organization_id) {
    return NextResponse.json(
      { ok: false, error: "No organization assigned." },
      { status: 400 },
    );
  }

  const runTimeUtc = payload.runTimeUtc ?? DEFAULT_SCHEDULE.runTimeUtc;
  const timeForDb =
    runTimeUtc.length === 5 ? `${runTimeUtc}:00` : runTimeUtc;
  const runsPerDay = Math.min(
    4,
    Math.max(1, Number(payload.runsPerDay ?? DEFAULT_SCHEDULE.runsPerDay)),
  );

  const legacyBody = {
    organization_id: orgUser.organization_id,
    cadence: payload.cadence ?? DEFAULT_SCHEDULE.cadence,
    run_time_utc: timeForDb,
    enabled: payload.enabled ?? DEFAULT_SCHEDULE.enabled,
    updated_at: new Date().toISOString(),
  };

  const extendedBody = {
    ...legacyBody,
    runs_per_day: runsPerDay,
    run_times_utc: Array.from({ length: runsPerDay }, () => timeForDb),
  };

  const { error } = await supabase.from("schedules").upsert(extendedBody);

  if (error) {
    const { error: legacyError } = await supabase
      .from("schedules")
      .upsert(legacyBody);

    if (legacyError) {
      return NextResponse.json(
        { ok: false, error: legacyError.message },
        { status: 403 },
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
