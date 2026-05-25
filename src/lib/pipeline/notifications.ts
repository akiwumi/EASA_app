import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

type PipelineFindingSummary = {
  regPart: string;
  sectionRef: string;
  riskLevel: string;
};

type DigestSummary = {
  orgName: string;
  reviewedLastWeek: number;
  pendingNow: number;
  nextScheduledScan: string | null;
};

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://flightlyceum.com").replace(/\/$/, "");
}

function pickRiskLabel(raw: string | null | undefined) {
  const value = (raw ?? "").toLowerCase();
  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  return "Low";
}

async function loadReviewRecipients(admin: SupabaseClient, organizationId: string) {
  const { data: users } = await admin
    .from("org_users")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .in("role", ["admin", "compliance_manager"]);

  const userIds = (users ?? []).map((user) => String(user.user_id)).filter(Boolean);
  if (userIds.length === 0) return [];

  const emailRows = await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId);
      return data?.user?.email ?? null;
    }),
  );

  return emailRows.filter((email): email is string => Boolean(email));
}

export async function loadQueuedFindingSummaries(
  admin: SupabaseClient,
  organizationId: string,
  runStartedAtIso: string,
) {
  const { data: queuedUpdates } = await admin
    .from("proposed_updates")
    .select("id, reg_change_id, risk_level, created_at")
    .eq("organization_id", organizationId)
    .gte("created_at", runStartedAtIso)
    .order("created_at", { ascending: false })
    .limit(50);

  const updates = (queuedUpdates ?? []).map((row) => ({
    id: String(row.id),
    regChangeId: (row.reg_change_id as string | null) ?? null,
    risk: pickRiskLabel((row.risk_level as string | null) ?? null),
  }));

  const regChangeIds = updates.map((update) => update.regChangeId).filter((value): value is string => Boolean(value));
  if (regChangeIds.length === 0) return [] as PipelineFindingSummary[];

  const { data: regChanges } = await admin
    .from("reg_changes")
    .select("id, reg_part, section_ref")
    .in("id", regChangeIds);

  const regChangeById = new Map(
    (regChanges ?? []).map((row) => [
      String(row.id),
      {
        regPart: ((row.reg_part as string | null) ?? "unknown").toUpperCase(),
        sectionRef: (row.section_ref as string | null) ?? "n/a",
      },
    ]),
  );

  const summaries: PipelineFindingSummary[] = [];
  for (const update of updates) {
    if (!update.regChangeId) continue;
    const reg = regChangeById.get(update.regChangeId);
    summaries.push({
      regPart: reg?.regPart ?? "UNKNOWN",
      sectionRef: reg?.sectionRef ?? "n/a",
      riskLevel: update.risk,
    });
  }

  return summaries;
}

export async function sendPipelineNewFindingsEmail(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    schoolName: string;
    findingCount: number;
    findings: PipelineFindingSummary[];
  },
) {
  if (input.findingCount <= 0) return { sent: 0, skipped: true };

  const recipients = await loadReviewRecipients(admin, input.organizationId);
  if (recipients.length === 0) return { sent: 0, skipped: true };

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log(`[pipeline-email] Would send ${input.findingCount} finding email to ${recipients.length} recipients (RESEND_API_KEY not set).`);
    return { sent: recipients.length, skipped: false };
  }

  const resend = new Resend(resendApiKey);
  const baseUrl = appBaseUrl();
  const queueUrl = `${baseUrl}/updates`;
  const list = input.findings.length > 0
    ? input.findings
        .slice(0, 20)
        .map((finding) => `- ${finding.regPart} · ${finding.sectionRef} · ${finding.riskLevel} risk`)
        .join("\n")
    : "- Open queue for details";
  const subject = `[${input.schoolName}] - ${input.findingCount} EASA regulation changes need your review`;
  const text = [
    `${input.findingCount} EASA regulation changes need your review.`,
    "",
    list,
    "",
    `Review now -> ${queueUrl}`,
  ].join("\n");

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@notifications.easaapp.com",
    to: recipients,
    subject,
    text,
  });

  return { sent: recipients.length, skipped: false };
}

async function loadWeeklyDigestSummary(admin: SupabaseClient, organizationId: string): Promise<DigestSummary> {
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: org }, { count: reviewedLastWeek }, { count: pendingNow }, { data: schedule }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    admin
      .from("proposed_updates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["approved", "rejected", "boneyard"])
      .gte("updated_at", sevenDaysAgoIso),
    admin
      .from("proposed_updates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    admin
      .from("schedules")
      .select("run_times_utc, run_time_utc")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  let nextScan: string | null = null;
  const slots = Array.isArray(schedule?.run_times_utc)
    ? schedule.run_times_utc.map((slot) => String(slot))
    : schedule?.run_time_utc
      ? [String(schedule.run_time_utc)]
      : [];
  if (slots.length > 0) {
    nextScan = slots.map((slot) => `${slot.slice(0, 5)} UTC`).join(", ");
  }

  return {
    orgName: ((org?.name as string | null) ?? "Your school").trim(),
    reviewedLastWeek: Number(reviewedLastWeek ?? 0),
    pendingNow: Number(pendingNow ?? 0),
    nextScheduledScan: nextScan,
  };
}

export async function sendWeeklySummaryEmails(admin: SupabaseClient, organizationId: string) {
  const recipients = await loadReviewRecipients(admin, organizationId);
  if (recipients.length === 0) return { sent: 0, skipped: true };

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log(`[pipeline-email] Would send weekly summary to ${recipients.length} recipients (RESEND_API_KEY not set).`);
    return { sent: recipients.length, skipped: false };
  }

  const summary = await loadWeeklyDigestSummary(admin, organizationId);
  const resend = new Resend(resendApiKey);
  const queueUrl = `${appBaseUrl()}/updates`;
  const subject = `[${summary.orgName}] - Weekly EASA compliance summary`;
  const text = [
    `Weekly EASA compliance summary for ${summary.orgName}`,
    "",
    `Items reviewed last week: ${summary.reviewedLastWeek}`,
    `Items still pending: ${summary.pendingNow}`,
    `Next scheduled scan: ${summary.nextScheduledScan ?? "Not configured"}`,
    "",
    `Review now -> ${queueUrl}`,
  ].join("\n");

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@notifications.easaapp.com",
    to: recipients,
    subject,
    text,
  });

  return { sent: recipients.length, skipped: false };
}
