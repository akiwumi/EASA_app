import { Resend } from "resend";

type SignupVerificationInput = {
  email: string;
  password: string;
  redirectTo: string;
  metadata: Record<string, unknown>;
};

type VerificationEmailInput = {
  actionLink: string;
  adminName?: string | null;
  schoolName?: string | null;
};

type SendVerificationEmailInput = VerificationEmailInput & {
  to: string;
};

const DEFAULT_FROM_EMAIL = "Flight Lyceum <hello@flightlyceum.com>";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function buildEmailVerificationRedirectUrl(appUrl = getAppUrl(), nextPath = "/welcome") {
  const url = new URL("/auth/callback", appUrl.replace(/\/$/, ""));
  url.searchParams.set("next", nextPath.startsWith("/") ? nextPath : "/welcome");
  return url.toString();
}

export function buildSignupVerificationLinkParams({
  email,
  password,
  redirectTo,
  metadata,
}: SignupVerificationInput) {
  return {
    type: "signup" as const,
    email,
    password,
    options: {
      redirectTo,
      data: metadata,
    },
  };
}

export function buildAccountVerificationEmail({
  actionLink,
  adminName,
  schoolName,
}: VerificationEmailInput) {
  const greeting = adminName?.trim() ? `Hi ${adminName.trim()},` : "Hi,";
  const schoolLine = schoolName?.trim()
    ? `Verify your account to finish setting up ${schoolName.trim()} on Flight Lyceum.`
    : "Verify your account to finish setting up Flight Lyceum.";
  const safeActionLink = escapeHtml(actionLink);
  const safeSchoolLine = escapeHtml(schoolLine);
  const safeGreeting = escapeHtml(greeting);

  return {
    subject: "Verify your Flight Lyceum account",
    text: [
      greeting,
      "",
      schoolLine,
      "",
      "After verification, you will land on the welcome page and can choose a subscription plan with Stripe.",
      "",
      actionLink,
      "",
      "This link verifies the account that requested the new flight school workspace.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#172525">
        <p>${safeGreeting}</p>
        <h1 style="font-size:24px;line-height:1.2;margin:18px 0 10px">Verify your Flight Lyceum account</h1>
        <p style="font-size:15px;line-height:1.7;color:#425f5f">${safeSchoolLine}</p>
        <p style="font-size:15px;line-height:1.7;color:#425f5f">After verification, you will land on the welcome page and can choose a subscription plan with Stripe.</p>
        <p style="margin:26px 0">
          <a href="${safeActionLink}" style="display:inline-block;border-radius:8px;background:#1f3434;color:#fff;padding:13px 18px;text-decoration:none;font-weight:700">Verify account</a>
        </p>
        <p style="font-size:12px;line-height:1.6;color:#667">If the button does not work, copy and paste this link into your browser:<br /><a href="${safeActionLink}">${safeActionLink}</a></p>
      </div>
    `,
  };
}

export async function sendAccountVerificationEmail({
  to,
  actionLink,
  adminName,
  schoolName,
}: SendVerificationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email sending is not configured. Set RESEND_API_KEY first.");
  }

  const email = buildAccountVerificationEmail({ actionLink, adminName, schoolName });
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}
