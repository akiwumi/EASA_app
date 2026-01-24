import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_SCHEDULE = {
  cadence: "daily",
  runTimeUtc: "06:00",
  enabled: true,
};

export async function GET() {
  const supabase = getSupabaseServerClient();

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
    .select("cadence, run_time_utc, enabled")
    .eq("organization_id", orgUser.organization_id)
    .maybeSingle();

  if (!schedule) {
    return NextResponse.json({ schedule: DEFAULT_SCHEDULE }, { status: 200 });
  }

  return NextResponse.json(
    {
      schedule: {
        cadence: schedule.cadence,
        runTimeUtc: schedule.run_time_utc.slice(0, 5),
        enabled: schedule.enabled,
      },
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

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

  const { error } = await supabase.from("schedules").upsert({
    organization_id: orgUser.organization_id,
    cadence: payload.cadence ?? DEFAULT_SCHEDULE.cadence,
    run_time_utc: payload.runTimeUtc ?? DEFAULT_SCHEDULE.runTimeUtc,
    enabled: payload.enabled ?? DEFAULT_SCHEDULE.enabled,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
