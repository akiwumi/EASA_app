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

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase environment variables are missing." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const { data: membership } = await admin
    .from("org_users")
    .select("organization_id, role, organizations ( name )")
    .eq("user_id", user.id)
    .maybeSingle();

  const organizationId =
    (membership?.organization_id as string | null) ?? DEFAULT_ORG_ID;
  const organizationName =
    (
      membership?.organizations as { name?: string } | null
    )?.name ?? "Demo Flight School";

  const [
    { data: org },
    { count: sourceCount },
    { count: activeSourceCount },
    { data: aiConfig },
    { data: schedule },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .maybeSingle(),
    admin
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    admin
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("active", true),
    admin
      .from("ai_provider_config")
      .select("provider, model, api_key, updated_at")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin
      .from("schedules")
      .select("enabled, run_time_utc, runs_per_day, updated_at")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  const linked = Boolean(membership?.organization_id);
  const isAdmin = linked ? membership?.role === "admin" : false;

  return NextResponse.json({
    currentUser: {
      id: user.id,
      email: user.email ?? null,
    },
    organization: {
      id: organizationId,
      name: org?.name ?? organizationName,
      linked,
      role: membership?.role ?? null,
      exists: Boolean(org),
      isAdmin,
    },
    setup: {
      hasOrganization: Boolean(org),
      sourcesTotal: sourceCount ?? 0,
      activeSources: activeSourceCount ?? 0,
      hasAiConfig: Boolean(aiConfig),
      aiProvider: aiConfig?.provider ?? null,
      aiModel: aiConfig?.model ?? null,
      hasAiKey: Boolean(aiConfig?.api_key),
      hasSchedule: Boolean(schedule),
      scheduleEnabled: schedule?.enabled ?? null,
      runsPerDay: schedule?.runs_per_day ?? null,
      runTimeUtc: schedule?.run_time_utc
        ? String(schedule.run_time_utc).slice(0, 5)
        : null,
    },
  });
}
