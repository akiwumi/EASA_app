import { NextResponse } from "next/server";
import { Resend } from "resend";

const TO_EMAIL = "hello@flightlyceum.com";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Flight Lyceum <hello@flightlyceum.com>";

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY is not set");
    return NextResponse.json(
      { error: "Email sending is not configured. Please contact us directly at hello@flightlyceum.com" },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { name, email, subject, message } = body as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name, email and message are required." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const subjectLine = subject?.trim()
      ? `[Flight Lyceum] ${subject}`
      : "[Flight Lyceum] New contact form message";

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: `${name} <${email}>`,
      subject: subjectLine,
      text: [
        `Name:    ${name}`,
        `Email:   ${email}`,
        `Subject: ${subject || "General enquiry"}`,
        "",
        message,
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="margin-bottom:4px">New message from Flight Lyceum contact form</h2>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0" />
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:6px 0;color:#6b7280;width:80px">Name</td><td style="padding:6px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Subject</td><td style="padding:6px 0">${subject || "General enquiry"}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0" />
          <p style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:#374151">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] Resend error:", err);
    return NextResponse.json(
      { error: "Failed to send your message. Please try again or email us directly at hello@flightlyceum.com" },
      { status: 500 },
    );
  }
}
