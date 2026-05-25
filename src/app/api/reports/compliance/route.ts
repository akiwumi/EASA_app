import { NextResponse } from "next/server";
import { getOrgScopedContext, getSupabaseAdminClient } from "@/lib/supabase/access";

function esc(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(line: string, max = 94) {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      out.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) out.push(current);
  return out;
}

function buildPages(lines: string[]) {
  const pages: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (current.length >= 48) {
      pages.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

function buildPdf(lines: string[]) {
  const pages = buildPages(lines);
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageIds = pages.map((_, index) => 3 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  pages.forEach((page, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const stream: string[] = ["BT", "/F1 10 Tf", "50 790 Td", "14 TL"];
    page.forEach((line, i) => {
      if (i > 0) stream.push("T*");
      stream.push(`(${esc(line)}) Tj`);
    });
    stream.push("ET");
    const body = stream.join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(body, "utf8")} >>\nstream\n${body}\nendstream`);
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export async function GET(request: Request) {
  const ctx = await getOrgScopedContext(["admin", "compliance_manager"]);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const { searchParams } = new URL(request.url);
  const end = searchParams.get("end") ? new Date(searchParams.get("end") as string) : now;
  const start = searchParams.get("start")
    ? new Date(searchParams.get("start") as string)
    : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const [{ data: org }, authUserResult] = await Promise.all([
    admin.from("organizations").select("name").eq("id", ctx.orgId).maybeSingle(),
    admin.auth.admin.getUserById(ctx.userId),
  ]);
  const schoolName = ((org?.name as string | null) ?? "School").trim();
  const generatedBy = authUserResult.data?.user?.email ?? "Unknown user";

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const [{ count: totalRegChanges }, { count: totalFindings }, { data: pendingUpdates }, { data: approvals }, { data: dismissedFindings }] = await Promise.all([
    admin
      .from("reg_changes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.orgId)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    admin
      .from("ai_findings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.orgId)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    admin
      .from("proposed_updates")
      .select("id, ai_rationale, risk_level, reg_changes(section_ref, reg_part)")
      .eq("organization_id", ctx.orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("approvals")
      .select("id, action, created_at, approver_id, proposed_updates(id, ai_rationale, ai_suggested_text, flightbook_section_id, reg_changes(section_ref, reg_part), flightbook_sections(body))")
      .eq("organization_id", ctx.orgId)
      .eq("action", "approved")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("ai_findings")
      .select("id, summary, dismissal_reason, dismissed_at, dismissed_by, reg_changes(section_ref, reg_part)")
      .eq("organization_id", ctx.orgId)
      .not("dismissed_at", "is", null)
      .gte("dismissed_at", startIso)
      .lte("dismissed_at", endIso)
      .order("dismissed_at", { ascending: false })
      .limit(200),
  ]);

  const approverIds = Array.from(new Set((approvals ?? []).map((row) => row.approver_id as string | null).filter(Boolean))) as string[];
  const dismissUserIds = Array.from(new Set((dismissedFindings ?? []).map((row) => row.dismissed_by as string | null).filter(Boolean))) as string[];
  const userIds = Array.from(new Set([...approverIds, ...dismissUserIds]));
  const userNameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const [{ data: profiles }, authUsers] = await Promise.all([
      admin.from("user_profiles").select("id, display_name").in("id", userIds),
      Promise.all(userIds.map(async (id) => ({ id, result: await admin.auth.admin.getUserById(id) }))),
    ]);
    for (const profile of profiles ?? []) {
      if (profile.id && profile.display_name) userNameMap.set(String(profile.id), String(profile.display_name));
    }
    for (const authUser of authUsers) {
      if (!userNameMap.has(authUser.id)) {
        const email = authUser.result.data?.user?.email;
        if (email) userNameMap.set(authUser.id, email);
      }
    }
  }

  const approvedCount = (approvals ?? []).length;
  const dismissedCount = (dismissedFindings ?? []).length;
  const pendingCount = (pendingUpdates ?? []).length;

  const lines: string[] = [];
  lines.push("Compliance Audit Report");
  lines.push("");
  lines.push(`School: ${schoolName}`);
  lines.push(`Reporting period: ${startIso.slice(0, 10)} to ${endIso.slice(0, 10)}`);
  lines.push(`Generated date: ${now.toISOString().slice(0, 10)}`);
  lines.push(`Generated by: ${generatedBy}`);
  lines.push("");
  lines.push("Summary");
  lines.push(`- Total regulation changes monitored: ${Number(totalRegChanges ?? 0)}`);
  lines.push(`- Total findings generated: ${Number(totalFindings ?? 0)}`);
  lines.push(`- Total approved: ${approvedCount}`);
  lines.push(`- Total dismissed with reason: ${dismissedCount}`);
  lines.push(`- Total pending: ${pendingCount}`);
  lines.push("");
  lines.push("Approved changes");
  if (approvedCount === 0) {
    lines.push("No approved changes in this reporting period.");
  } else {
    for (const approval of approvals ?? []) {
      const proposed = Array.isArray(approval.proposed_updates)
        ? approval.proposed_updates[0]
        : approval.proposed_updates;
      const regChange = Array.isArray((proposed as Record<string, unknown> | null)?.reg_changes)
        ? (((proposed as Record<string, unknown>).reg_changes as unknown[])[0] as Record<string, unknown> | null)
        : (((proposed as Record<string, unknown> | null)?.reg_changes as Record<string, unknown> | null) ?? null);
      const priorText = Array.isArray((proposed as Record<string, unknown> | null)?.flightbook_sections)
        ? (((proposed as Record<string, unknown>).flightbook_sections as unknown[])[0] as Record<string, unknown> | null)
        : (((proposed as Record<string, unknown> | null)?.flightbook_sections as Record<string, unknown> | null) ?? null);
      const heading = [
        (regChange?.reg_part as string | null | undefined) ?? "Unknown part",
        (regChange?.section_ref as string | null | undefined) ?? "n/a",
      ].join(" · ");
      lines.push(`* ${heading}`);
      lines.push(...wrapLine(`  Regulation changed: ${(proposed as Record<string, unknown> | null)?.ai_rationale as string | null ?? "No rationale"}`));
      lines.push(...wrapLine(`  Previous text: ${(priorText?.body as string | null | undefined) ?? "Unavailable"}`));
      lines.push(...wrapLine(`  Approved text: ${(proposed as Record<string, unknown> | null)?.ai_suggested_text as string | null ?? "Unavailable"}`));
      lines.push(`  Approved by: ${userNameMap.get(String(approval.approver_id)) ?? "Unknown"} on ${String(approval.created_at).slice(0, 19).replace("T", " ")} UTC`);
    }
  }
  lines.push("");
  lines.push("Dismissed with reason");
  if (dismissedCount === 0) {
    lines.push("No dismissed findings in this reporting period.");
  } else {
    for (const finding of dismissedFindings ?? []) {
      const regChange = Array.isArray(finding.reg_changes)
        ? finding.reg_changes[0]
        : finding.reg_changes;
      const heading = [
        ((regChange as Record<string, unknown> | null)?.reg_part as string | null | undefined) ?? "Unknown part",
        ((regChange as Record<string, unknown> | null)?.section_ref as string | null | undefined) ?? "n/a",
      ].join(" · ");
      lines.push(`* ${heading}`);
      lines.push(...wrapLine(`  Finding: ${(finding.summary as string | null) ?? "No summary"}`));
      lines.push(`  Dismissed by: ${userNameMap.get(String(finding.dismissed_by)) ?? "Unknown"} on ${String(finding.dismissed_at).slice(0, 19).replace("T", " ")} UTC`);
      lines.push(...wrapLine(`  Reason: ${(finding.dismissal_reason as string | null) ?? "No reason provided"}`));
    }
  }
  lines.push("");
  lines.push("Pending");
  if (pendingCount === 0) {
    lines.push("No pending items as of report date.");
  } else {
    for (const pending of pendingUpdates ?? []) {
      const regChange = Array.isArray(pending.reg_changes) ? pending.reg_changes[0] : pending.reg_changes;
      const heading = [
        ((regChange as Record<string, unknown> | null)?.reg_part as string | null | undefined) ?? "Unknown part",
        ((regChange as Record<string, unknown> | null)?.section_ref as string | null | undefined) ?? "n/a",
      ].join(" · ");
      lines.push(`* ${heading} · ${(pending.risk_level as string | null) ?? "unknown"} risk`);
      lines.push(...wrapLine(`  ${(pending.ai_rationale as string | null) ?? "No rationale"}`));
    }
  }

  const content = buildPdf(lines);
  const filename = `compliance-audit-${startIso.slice(0, 10)}-to-${endIso.slice(0, 10)}.pdf`;
  return new Response(new Uint8Array(content), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
