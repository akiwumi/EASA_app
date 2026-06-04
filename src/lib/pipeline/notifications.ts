import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateReportPdf } from "@/lib/pipeline/generate-report-pdf";

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

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function riskBadge(risk: string) {
  const colors: Record<string, string> = {
    High: "background:#b91c1c;color:#fff",
    Medium: "background:#d97706;color:#fff",
    Low: "background:#15803d;color:#fff",
  };
  const style = colors[risk] ?? colors.Low;
  return `<span style="display:inline-block;${style};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;letter-spacing:.5px">${esc(risk)}</span>`;
}

function emailWrapper(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#1f3434;padding:24px 32px">
            <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.5px">Flight Lyceum</span>
            <span style="color:#7fb3b3;font-size:13px;margin-left:10px">EASA Compliance</span>
          </td>
        </tr>
        <tr><td style="padding:32px">${body}</td></tr>
        <tr>
          <td style="background:#f4f6f8;padding:16px 32px;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">
              This is an automated message from Flight Lyceum. Do not reply to this email.<br />
              Manage notification preferences in your <a href="${appBaseUrl()}/profile" style="color:#1f3434">account settings</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildFindingsRows(findings: PipelineFindingSummary[]) {
  if (findings.length === 0) {
    return `<tr><td colspan="3" style="padding:12px;color:#6b7280;font-size:13px">Open the queue for details.</td></tr>`;
  }
  return findings
    .slice(0, 20)
    .map(
      (f) => `
    <tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#1f3434">${esc(f.regPart)}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151">${esc(f.sectionRef)}</td>
      <td style="padding:10px 12px">${riskBadge(f.riskLevel)}</td>
    </tr>`,
    )
    .join("");
}

export function buildNewFindingsEmail(input: {
  schoolName: string;
  findingCount: number;
  findings: PipelineFindingSummary[];
  queueUrl: string;
  runDate: string;
}) {
  const subject = `[${input.schoolName}] ${input.findingCount} EASA regulation change${input.findingCount === 1 ? "" : "s"} need your review`;

  const plainList =
    input.findings.length > 0
      ? input.findings
          .slice(0, 20)
          .map((f) => `  - ${f.regPart} · ${f.sectionRef} · ${f.riskLevel} risk`)
          .join("\n")
      : "  - Open queue for details";

  const text = [
    `${input.findingCount} EASA regulation change${input.findingCount === 1 ? "" : "s"} need your review — ${input.schoolName}`,
    `Detected: ${input.runDate}`,
    "",
    plainList,
    "",
    `Review now: ${input.queueUrl}`,
  ].join("\n");

  const hasMore = input.findings.length > 20;
  const moreNote = hasMore
    ? `<p style="font-size:12px;color:#6b7280;margin:8px 0 0">…and ${input.findings.length - 20} more. Open the queue to see all.</p>`
    : "";

  const html = emailWrapper(`
    <h1 style="margin:0 0 6px;font-size:22px;color:#1f3434;line-height:1.2">
      ${esc(String(input.findingCount))} EASA regulation change${input.findingCount === 1 ? "" : "s"} need your review
    </h1>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280">${esc(input.schoolName)} &middot; Detected ${esc(input.runDate)}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:8px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;letter-spacing:.5px;text-transform:uppercase">Reg Part</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;letter-spacing:.5px;text-transform:uppercase">Section</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;letter-spacing:.5px;text-transform:uppercase">Risk</th>
        </tr>
      </thead>
      <tbody>
        ${buildFindingsRows(input.findings)}
      </tbody>
    </table>
    ${moreNote}

    <p style="margin:28px 0 0">
      <a href="${esc(input.queueUrl)}" style="display:inline-block;background:#1f3434;color:#fff;padding:13px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Review now &rarr;</a>
    </p>
  `);

  return { subject, text, html };
}

export function buildWeeklyDigestEmail(summary: DigestSummary, queueUrl: string, reportDate: string) {
  const subject = `[${summary.orgName}] Weekly EASA compliance summary`;

  const text = [
    `Weekly EASA compliance summary — ${summary.orgName}`,
    `Report date: ${reportDate}`,
    "",
    `Items reviewed last week:  ${summary.reviewedLastWeek}`,
    `Items still pending:       ${summary.pendingNow}`,
    `Next scheduled scan:       ${summary.nextScheduledScan ?? "Not configured"}`,
    "",
    `Open queue: ${queueUrl}`,
  ].join("\n");

  const pendingColor = summary.pendingNow > 0 ? "#b91c1c" : "#15803d";

  const html = emailWrapper(`
    <h1 style="margin:0 0 6px;font-size:22px;color:#1f3434;line-height:1.2">Weekly EASA compliance summary</h1>
    <p style="margin:0 0 28px;font-size:13px;color:#6b7280">${esc(summary.orgName)} &middot; ${esc(reportDate)}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px">
      <tbody>
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:16px 20px;font-size:14px;color:#374151">Items reviewed last week</td>
          <td style="padding:16px 20px;font-size:22px;font-weight:700;color:#1f3434;text-align:right">${summary.reviewedLastWeek}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:16px 20px;font-size:14px;color:#374151">Items still pending review</td>
          <td style="padding:16px 20px;font-size:22px;font-weight:700;color:${pendingColor};text-align:right">${summary.pendingNow}</td>
        </tr>
        <tr>
          <td style="padding:16px 20px;font-size:14px;color:#374151">Next scheduled scan</td>
          <td style="padding:16px 20px;font-size:14px;color:#6b7280;text-align:right">${esc(summary.nextScheduledScan ?? "Not configured")}</td>
        </tr>
      </tbody>
    </table>

    <p style="margin:0">
      <a href="${esc(queueUrl)}" style="display:inline-block;background:#1f3434;color:#fff;padding:13px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Open compliance queue &rarr;</a>
    </p>
  `);

  return { subject, text, html };
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

  const queueUrl = `${appBaseUrl()}/updates`;
  const runDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const email = buildNewFindingsEmail({ ...input, queueUrl, runDate });

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateReportPdf({
      schoolName: input.schoolName,
      findingCount: input.findingCount,
      findings: input.findings,
      reportDate: runDate,
    });
  } catch {
    // PDF generation is best-effort — send the email without it if it fails
  }

  const filename = `EASA-Compliance-Report-${new Date().toISOString().slice(0, 10)}.pdf`;

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@notifications.easaapp.com",
    to: recipients,
    subject: email.subject,
    text: email.text,
    html: email.html,
    ...(pdfBuffer
      ? { attachments: [{ filename, content: pdfBuffer.toString("base64") }] }
      : {}),
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
  const queueUrl = `${appBaseUrl()}/updates`;
  const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const email = buildWeeklyDigestEmail(summary, queueUrl, reportDate);

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@notifications.easaapp.com",
    to: recipients,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  return { sent: recipients.length, skipped: false };
}
