import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/access";

function authorized(request: Request) {
  const secret = process.env.SCHEDULED_PIPELINE_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

type DigestUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  notification_digest: "daily" | "partial";
};

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  created_at: string;
};

const PARTIAL_DIGEST_TYPES = new Set([
  "approval_needed",
  "approved",
  "rejected",
  "revision_requested",
  "rollback",
]);

function buildDailyHtml(user: DigestUser, notifications: NotificationRow[], appUrl: string): string {
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
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const appUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://flightlyceum.com").replace(/\/$/, "");

  if (!apiKey) {
    console.log(`[digest] Would send to ${user.email} (RESEND_API_KEY not set)`);
    return { ok: true };
  }

  const lines = notifications.map((n) => `• ${n.title}${n.body ? `: ${n.body}` : ""}`).join("\n");
  const html = buildDailyHtml(user, notifications, appUrl);
  const subject = `Your daily digest: ${notifications.length} update${notifications.length !== 1 ? "s" : ""}`;
  const text = `Hello,\n\nYour daily digest:\n\n${lines}\n\nLog in: ${appUrl}/updates`;

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

async function runDigest(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  const now = new Date();
  const dailySince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  // Find users opted into batched email digests
  const { data: profiles, error: profilesError } = await admin
    .from("user_profiles")
    .select("id, display_name, notification_digest")
    .in("notification_digest", ["daily", "partial"])
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
    const digestPreference = profile.notification_digest === "partial"
        ? "partial"
        : "daily";

    // Fetch unread notifications from the active digest window.
    const { data: notifications } = await admin
      .from("notifications")
      .select("id, title, body, type, created_at")
      .eq("user_id", userId)
      .eq("read", false)
      .gte("created_at", dailySince)
      .order("created_at", { ascending: false })
      .limit(20);

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

    const result = await sendDigestEmail(user, filteredNotifications);
    results.push({ userId, notificationCount: filteredNotifications.length, ...result });
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    digestsSent: results.filter((r) => r.ok).length,
    results,
  });
}

export async function GET(request: Request) {
  return runDigest(request);
}

export async function POST(request: Request) {
  return runDigest(request);
}
