import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";

type ChecklistKey =
  | "branding"
  | "sources"
  | "ai"
  | "schedule"
  | "manuals"
  | "programmes"
  | "assignments";

const CHECKLIST_META: Record<ChecklistKey, { label: string; help: string }> = {
  branding: {
    label: "Brand the school workspace",
    help: "Set the public school name, colours, and contact details used during onboarding and demos.",
  },
  sources: {
    label: "Connect live EASA sources",
    help: "The monitoring pipeline needs active feeds before compliance review becomes useful.",
  },
  ai: {
    label: "Save AI provider settings",
    help: "Grounded search, draft suggestions, and matching need a working provider configuration.",
  },
  schedule: {
    label: "Choose an automation schedule",
    help: "This controls how often the app checks for changes and prepares review queues.",
  },
  manuals: {
    label: "Import at least one manual",
    help: "Upload a flight book so the app has real operating content to map against updates and lessons.",
  },
  programmes: {
    label: "Create a training programme",
    help: "Programmes and phases unlock lesson-linked reading, acknowledgements, and instructor workflows.",
  },
  assignments: {
    label: "Assign the first training record",
    help: "Create at least one reading assignment so students and instructors see the workflow end to end.",
  },
};

function isMissingSchemaError(error: { code?: string | null; message?: string | null } | null | undefined) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    /could not find the table/i.test(error?.message ?? "") ||
    /relation .* does not exist/i.test(error?.message ?? "")
  );
}

async function loadSnapshot(orgId: string) {
  const admin = getSupabaseAdminClient();
  const [
    brandingResult,
    sourcesResult,
    aiResult,
    scheduleResult,
    manualsResult,
    programmesResult,
    assignmentsResult,
    checklistResult,
  ] = await Promise.all([
    admin
      .from("organization_branding")
      .select("public_name, primary_color, contact_email")
      .eq("organization_id", orgId)
      .maybeSingle(),
    admin
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("type", "rss")
      .or(`organization_id.eq.${orgId},organization_id.is.null`)
      .eq("active", true),
    admin
      .from("ai_provider_config")
      .select("provider, api_key")
      .eq("organization_id", orgId)
      .maybeSingle(),
    admin
      .from("schedules")
      .select("enabled")
      .eq("organization_id", orgId)
      .maybeSingle(),
    admin
      .from("flightbooks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("training_programmes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("document_assignments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("onboarding_checklists")
      .select("key, completed")
      .eq("organization_id", orgId),
  ]);

  const checklistSchemaReady = !isMissingSchemaError(checklistResult.error);
  const trainingSchemaReady =
    !isMissingSchemaError(programmesResult.error) &&
    !isMissingSchemaError(assignmentsResult.error);
  const brandingSchemaReady = !isMissingSchemaError(brandingResult.error);

  const savedMap = new Map(
    (checklistResult.data ?? []).map((row) => [String(row.key) as ChecklistKey, Boolean(row.completed)]),
  );

  const autoDone: Record<ChecklistKey, boolean> = {
    branding: Boolean(
      brandingResult.data &&
        ((brandingResult.data.public_name as string | null) ||
          (brandingResult.data.primary_color as string | null) ||
          (brandingResult.data.contact_email as string | null)),
    ),
    sources: Number(sourcesResult.count ?? 0) > 0,
    ai: Boolean(
      (aiResult.data?.provider as string | null) &&
        ((aiResult.data?.provider as string) === "openai" || (aiResult.data?.api_key as string | null)),
    ),
    schedule: Boolean(scheduleResult.data),
    manuals: Number(manualsResult.count ?? 0) > 0,
    programmes: !isMissingSchemaError(programmesResult.error) && Number(programmesResult.count ?? 0) > 0,
    assignments: !isMissingSchemaError(assignmentsResult.error) && Number(assignmentsResult.count ?? 0) > 0,
  };

  return {
    schemaReady: checklistSchemaReady,
    trainingSchemaReady,
    brandingSchemaReady,
    items: (Object.keys(CHECKLIST_META) as ChecklistKey[]).map((key) => ({
      key,
      label: CHECKLIST_META[key].label,
      help: CHECKLIST_META[key].help,
      autoDone: autoDone[key],
      completed: autoDone[key] || Boolean(savedMap.get(key)),
    })),
  };
}

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await loadSnapshot(ctx.orgId);
  return NextResponse.json(payload);
}

export async function PATCH(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    key?: ChecklistKey;
    completed?: boolean;
  };

  if (!body.key || !(body.key in CHECKLIST_META)) {
    return NextResponse.json({ error: "Valid checklist key required." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("onboarding_checklists")
    .upsert(
      {
        organization_id: ctx.orgId,
        key: body.key,
        label: CHECKLIST_META[body.key].label,
        completed: Boolean(body.completed),
        completed_at: body.completed ? new Date().toISOString() : null,
      },
      { onConflict: "organization_id,key" },
    );

  if (error && isMissingSchemaError(error)) {
    return NextResponse.json(
      { error: "Onboarding checklist persistence will be available after the Phase 3 migrations are applied." },
      { status: 400 },
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(await loadSnapshot(ctx.orgId));
}
