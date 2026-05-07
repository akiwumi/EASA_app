import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import { seedDefaultSources } from "@/lib/seed-default-sources";

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const organizationId = ctx.orgId;

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
      .eq("type", "rss")
      .or(`organization_id.eq.${organizationId},organization_id.is.null`),
    admin
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("type", "rss")
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
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

  if ((activeSourceCount ?? 0) === 0) {
    await seedDefaultSources(organizationId);
  }

  const linked = Boolean(organizationId);
  const isAdmin = ctx.role === "admin";

  return NextResponse.json({
    currentUser: {
      id: ctx.userId,
      email: null,
    },
    organization: {
      id: organizationId,
      name: org?.name ?? "Demo Flight School",
      linked,
      role: ctx.role,
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
      hasAiKey: Boolean(aiConfig?.provider === "openai" || aiConfig?.api_key),
      hasSchedule: Boolean(schedule),
      scheduleEnabled: schedule?.enabled ?? null,
      runsPerDay: schedule?.runs_per_day ?? null,
      runTimeUtc: schedule?.run_time_utc
        ? String(schedule.run_time_utc).slice(0, 5)
        : null,
    },
  });
}
