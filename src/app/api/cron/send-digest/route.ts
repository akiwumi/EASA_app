import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/access";

function authorized(request: Request) {
  const secret = process.env.SCHEDULED_PIPELINE_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

type DigestUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  notification_digest: "daily" | "partial" | "weekly";
};

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  created_at: string;
};

type OrgStats = {
  orgName: string;
  detectedThisWeek: number;
  pendingReview: number;
  acknowledgedThisWeek: number;
};

const PARTIAL_DIGEST_TYPES = new Set([
  "approval_needed",
  "approved",
  "rejected",
  "revision_requested",
  "rollback",
]);

async function loadOrgStatsForUser(userId: string): Promise<OrgStats | null> {
  const admin = getSupabaseAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: membership } = await admin
    .from("org_users")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) return null;
  const orgId = membership.organization_id as string;

  const [
    { data: org },
    { count: detectedThisWeek },
    { count: pendingReview },
    { count: acknowledgedThisWeek },
  ] = await Promise.all([
    admin.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    admin
      .from("reg_changes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("detected_at", sevenDaysAgo),
    admin
      .from("proposed_updates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "pending"),
    admin
      .from("acknowledgements")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "acknowledged")
      .gte("updated_at", sevenDaysAgo),
  ]);

  return {
    orgName: (org?.name as string | null) ?? "Your school",
    detectedThisWeek: detectedThisWeek ?? 0,
    pendingReview: pendingReview ?? 0,
    acknowledgedThisWeek: acknowledgedThisWeek ?? 0,
  };
}

function buildWeeklyHtml(
  user: DigestUser,
  notifications: NotificationRow[],
  stats: OrgStats,
  appUrl: string,
): string {
  const weekLabel = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const statBoxStyle = "display:inline-block;width:30%;text-align:center;padding:16px 8px;background:#f5f5f0;border-radius:8px;margin:0 1%;";
  const statBoxes = `
    <div style="text-align:center;margin:24px 0;">
      <div style="${statBoxStyle}">
        <div style="font-size:28px;font-weight:700;color:#0d1817;">${stats.detectedThisWeek}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Changes detected</div>
      </div>
      <div style="${statBoxStyle}">
        <div style="font-size:28px;font-weight:700;color:${stats.pendingReview > 0 ? "#d97706" : "#0d1817"};">${stats.pendingReview}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Pending review</div>
      </div>
      <div style="${statBoxStyle}">
        <div style="font-size:28px;font-weight:700;color:#0d1817;">${stats.acknowledgedThisWeek}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Acknowledged</div>
      </div>
    </div>
  `;

  const notifItems = notifications.length > 0
    ? `<ul style="margin:16px 0;padding:0;list-style:none;">
        ${notifications.map((n) => `
          <li style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <strong style="color:#0d1817;">${n.title}</strong>
            ${n.body ? `<br/><span style="font-size:13px;color:#6b7280;">${n.body}</span>` : ""}
          </li>`).join("")}
       </ul>`
    : `<p style="color:#6b7280;font-style:italic;">No new items in your notification queue this week.</p>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9f8f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr><td style="background:#0d1817;padding:24px 32px;">
          <p style="margin:0;color:#a3b89a;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Flight Lyceum</p>
          <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:600;">EASA Watch</h1>
          <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Week of ${weekLabel} · ${stats.orgName}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0;color:#374151;font-size:15px;">Hello${user.display_name ? ` ${user.display_name}` : ""},</p>
          <p style="margin:12px 0 0;color:#6b7280;font-size:14px;">Here is your weekly EASA compliance summary for <strong>${stats.orgName}</strong>.</p>

          ${statBoxes}

          <h2 style="margin:24px 0 8px;font-size:14px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:1px;">This week's notifications</h2>
          ${notifItems}

          <!-- CTA -->
          <div style="text-align:center;margin:32px 0 0;">
            <a href="${appUrl}/updates" style="display:inline-block;background:#0d1817;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:24px;font-size:14px;font-weight:600;">
              Review pending updates →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">You're receiving this because you have weekly digests enabled. <a href="${appUrl}/settings" style="color:#6b7280;">Manage preferences</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildDailyHtml(user: DigestUser, notifications: NotificationRow[], appUrl: string): string {
  const lines = notifications.map((n) => `• ${n.title}${n.body ? `: ${n.body}` : ""}`).join("\n");
  return `
    <p style="font-family:sans-serif;">Hello${user.display_name ? ` ${user.display_name}` : ""},</p>
    <p style="font-family:sans-serif;">Here is your daily notification digest from your EASA compliance workspace:</p>
    <ul style="font-family:sans-serif;">
      ${notifications.map((n) => `<li><strong>${n.title}</strong>${n.body ? `<br/>${n.body}` : ""}</li>`).join("")}
    </ul>
    <p style="font-family:sans-serif;"><a href="${appUrl}/updates">Log in to review and action these items →</a></p>
  `.trim();
}

async function sendDigestEmail(
  user: DigestUser,
  notifications: NotificationRow[],
  orgStats: OrgStats | null,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const appUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://flightlyceum.com").replace(/\/$/, "");

  if (!apiKey) {
    console.log(`[digest] Would send to ${user.email} (RESEND_API_KEY not set)`);
    return { ok: true };
  }

  const isWeekly = user.notification_digest === "weekly";
  const lines = notifications.map((n) => `• ${n.title}${n.body ? `: ${n.body}` : ""}`).join("\n");

  const html = isWeekly && orgStats
    ? buildWeeklyHtml(user, notifications, orgStats, appUrl)
    : buildDailyHtml(user, notifications, appUrl);

  const subject = isWeekly
    ? `EASA Watch:weekly compliance digest`
    : `Your daily digest: ${notifications.length} update${notifications.length !== 1 ? "s" : ""}`;

  const text = isWeekly && orgStats
    ? `EASA Watch:${orgStats.orgName}\n\nChanges this week: ${orgStats.detectedThisWeek} | Pending review: ${orgStats.pendingReview} | Acknowledged: ${orgStats.acknowledgedThisWeek}\n\n${lines}\n\nLog in: ${appUrl}/updates`
    : `Hello,\n\nYour daily digest:\n\n${lines}\n\nLog in: ${appUrl}/updates`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@notifications.easaapp.com",
      to: user.email,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body };
  }

  return { ok: true };
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function shouldSendWeeklyDigest(date: Date) {
  return date.getUTCDay() === 1;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  const now = new Date();
  const dailySince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weeklySince = startOfUtcDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).toISOString();
  const weeklyRun = shouldSendWeeklyDigest(now);

  // Find users opted into batched email digests
  const { data: profiles, error: profilesError } = await admin
    .from("user_profiles")
    .select("id, display_name, notification_digest")
    .in("notification_digest", ["daily", "partial", "weekly"])
    .eq("notification_email", true);

  if (profilesError) {
    return NextResponse.json({ ok: false, error: profilesError.message }, { status: 400 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No digest subscribers" });
  }

  const userIds = profiles.map((p) => p.id as string);

  // Fetch auth emails for these users in parallel
  const emailEntries = await Promise.all(
    userIds.map(async (userId) => {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      return [userId, authUser?.user?.email ?? null] as const;
    }),
  );
  const emailMap: Record<string, string | null> = Object.fromEntries(emailEntries);

  const results: Array<{ userId: string; notificationCount: number; ok: boolean; error?: string }> =
    [];

  for (const profile of profiles) {
    const userId = profile.id as string;
    const email = emailMap[userId];
    if (!email) continue;
    const digestPreference = profile.notification_digest === "weekly"
      ? "weekly"
      : profile.notification_digest === "partial"
        ? "partial"
        : "daily";
    if (digestPreference === "weekly" && !weeklyRun) continue;

    // Fetch unread notifications from the active digest window.
    const { data: notifications } = await admin
      .from("notifications")
      .select("id, title, body, type, created_at")
      .eq("user_id", userId)
      .eq("read", false)
      .gte("created_at", digestPreference === "weekly" ? weeklySince : dailySince)
      .order("created_at", { ascending: false })
      .limit(digestPreference === "weekly" ? 50 : 20);

    const filteredNotifications = (notifications as NotificationRow[] | null)?.filter((notification) => (
      digestPreference === "partial"
        ? PARTIAL_DIGEST_TYPES.has(notification.type)
        : true
    )) ?? [];

    if (filteredNotifications.length === 0) continue;

    const user: DigestUser = {
      id: userId,
      email,
      display_name: (profile.display_name as string | null) ?? null,
      notification_digest: digestPreference,
    };

    const orgStats = digestPreference === "weekly" ? await loadOrgStatsForUser(userId) : null;
    const result = await sendDigestEmail(user, filteredNotifications, orgStats);
    results.push({ userId, notificationCount: filteredNotifications.length, ...result });
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    digestsSent: results.filter((r) => r.ok).length,
    results,
  });
}
