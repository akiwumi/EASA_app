// EASA Compliance App — notifications Edge Function
// MASTER_BUILD §9.9 — Notifications
//
// Input:  POST { trigger_type, entity_type, entity_id, organization_id, title?, body? }
//
// trigger_type values:
//   new_change           — regulation change detected (diff-worker)
//   approval_needed      — proposed update created (relevance-engine)
//   auto_approve_scheduled — low-risk update queued for auto-approve
//   approved             — update approved (apply-update)
//   rejected             — update rejected
//   revision_requested   — editor requested revision
//   rollback             — section rolled back
//
// For each org user:
//   1. Write a notifications row (if notification_inapp = true or default)
//   2. Send a Resend email (if notification_email = true)
//      — Digest users are queued; immediate users get an email right away
//
// Deploy: supabase functions deploy notifications --use-api

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "EASA Console <noreply@southswedenaviation.se>";

interface OrgUser {
  user_id: string;
  notification_email: boolean;
  notification_inapp: boolean;
  notification_digest: string;
  email: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      trigger_type,
      entity_type,
      entity_id,
      organization_id,
      title: customTitle,
      body: customBody,
    } = (await req.json()) as {
      trigger_type: string;
      entity_type: string;
      entity_id: string;
      organization_id: string;
      title?: string;
      body?: string;
    };

    if (!trigger_type || !organization_id) {
      return new Response(
        JSON.stringify({ error: "trigger_type and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Build notification title + body from trigger_type ---
    const { title, body } = resolveContent(trigger_type, entity_type, customTitle, customBody);

    // --- Fetch all org users with their profiles ---
    const { data: orgUsers, error: ouErr } = await admin
      .from("org_users")
      .select("user_id")
      .eq("organization_id", organization_id);

    if (ouErr || !orgUsers?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = orgUsers.map((u: { user_id: string }) => u.user_id);

    // Fetch profiles for all users (defaults used if profile row absent)
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("id, notification_email, notification_inapp, notification_digest")
      .in("id", userIds);

    // Fetch auth emails via admin API
    const { data: authUsers } = await admin.auth.admin.listUsers();
    const emailMap = new Map<string, string>(
      (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]),
    );

    // Build per-user notification preferences
    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; notification_email: boolean; notification_inapp: boolean; notification_digest: string }) => [p.id, p]),
    );

    const users: OrgUser[] = userIds.map((uid: string) => {
      const p = profileMap.get(uid);
      return {
        user_id: uid,
        notification_email: p?.notification_email ?? true,
        notification_inapp: p?.notification_inapp ?? true,
        notification_digest: p?.notification_digest ?? "immediate",
        email: emailMap.get(uid) ?? null,
      };
    });

    // --- Write in-app notification rows ---
    const inAppRows = users
      .filter((u) => u.notification_inapp)
      .map((u) => ({
        organization_id,
        user_id: u.user_id,
        type: trigger_type,
        title,
        body,
        related_entity_type: entity_type || null,
        related_entity_id: entity_id || null,
      }));

    if (inAppRows.length > 0) {
      await admin.from("notifications").insert(inAppRows);
    }

    // --- Send Resend emails for immediate-preference users ---
    let emailsSent = 0;

    if (resendApiKey) {
      const immediateEmailUsers = users.filter(
        (u) => u.notification_email && u.notification_digest === "immediate" && u.email,
      );

      for (const u of immediateEmailUsers) {
        await sendEmail(resendApiKey, {
          to: u.email!,
          subject: title,
          html: buildEmailHtml({ title, body, trigger_type, entity_type, entity_id }),
        });
        emailsSent++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, inAppSent: inAppRows.length, emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveContent(
  triggerType: string,
  entityType: string,
  customTitle?: string,
  customBody?: string,
): { title: string; body: string } {
  if (customTitle) return { title: customTitle, body: customBody ?? "" };

  const map: Record<string, { title: string; body: string }> = {
    new_change: {
      title: "New regulation change detected",
      body: "A new EASA regulation change was detected and is ready for review.",
    },
    approval_needed: {
      title: "Update requires approval",
      body: "A proposed flight book update is awaiting admin approval.",
    },
    auto_approve_scheduled: {
      title: "Auto-approval scheduled",
      body: "A low-risk update has been scheduled for automatic approval. You can cancel within the lead-time window.",
    },
    approved: {
      title: "Update approved",
      body: `A proposed ${entityType === "proposed_update" ? "update" : "change"} has been approved and applied to the flight book.`,
    },
    rejected: {
      title: "Update rejected",
      body: "A proposed update was rejected.",
    },
    revision_requested: {
      title: "Revision requested",
      body: "An editor has requested a revision on a proposed update.",
    },
    rollback: {
      title: "Section rolled back",
      body: "A flight book section has been rolled back to a previous version.",
    },
  };

  return map[triggerType] ?? { title: `Notification: ${triggerType}`, body: "" };
}

async function sendEmail(
  apiKey: string,
  {
    to,
    subject,
    html,
  }: { to: string; subject: string; html: string },
) {
  await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
    }),
  });
}

function buildEmailHtml({
  title,
  body,
  trigger_type,
  entity_type,
  entity_id,
}: {
  title: string;
  body: string;
  trigger_type: string;
  entity_type: string;
  entity_id: string;
}): string {
  const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "";
  let actionUrl = appUrl;
  let actionLabel = "Open EASA Console";

  if (entity_type === "proposed_update" && entity_id) {
    actionUrl = `${appUrl}/updates/${entity_id}`;
    actionLabel = "Review update";
  } else if (entity_type === "flightbook_section") {
    actionUrl = `${appUrl}/history`;
    actionLabel = "View history";
  } else if (trigger_type === "new_change") {
    actionUrl = `${appUrl}/changes`;
    actionLabel = "View changes";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1A1A1C;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:32px auto">
    <tr>
      <td style="padding:24px;background:#232427;border-radius:16px;border:1px solid #3A3C41">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div style="width:40px;height:40px;background:#F07A2B;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;text-align:center;line-height:40px">EA</div>
          <div>
            <div style="font-size:14px;font-weight:600;color:#F2F2F4">EASA Console</div>
            <div style="font-size:12px;color:#8D9099">South Sweden Aviation</div>
          </div>
        </div>

        <h1 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#F2F2F4">${escapeHtml(title)}</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#C7C8CD">${escapeHtml(body)}</p>

        ${actionUrl ? `<a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:10px 20px;background:#F07A2B;color:#fff;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none">${escapeHtml(actionLabel)}</a>` : ""}

        <p style="margin:24px 0 0;font-size:11px;color:#8D9099">
          You received this email because you have email notifications enabled.
          Update your preferences in your <a href="${escapeHtml(appUrl)}/profile" style="color:#5AA2FF">profile settings</a>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
