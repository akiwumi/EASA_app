import PDFDocument from "pdfkit";

type Finding = {
  regPart: string;
  sectionRef: string;
  riskLevel: string;
};

type ReportInput = {
  schoolName: string;
  findingCount: number;
  findings: Finding[];
  reportDate: string;
};

const BRAND_DARK = "#1f3434";
const RISK_COLORS: Record<string, string> = {
  High: "#b91c1c",
  Medium: "#d97706",
  Low: "#15803d",
};

function countByRisk(findings: Finding[]) {
  const counts = { High: 0, Medium: 0, Low: 0 };
  for (const f of findings) {
    const key = f.riskLevel as keyof typeof counts;
    if (key in counts) counts[key]++;
    else counts.Low++;
  }
  return counts;
}

export async function generateReportPdf(input: ReportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: "EASA Compliance Report", Author: "Flight Lyceum" } });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 96; // content width after margins

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(48, 48, pageWidth, 52).fill(BRAND_DARK);
    doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold")
      .text("EASA Compliance Report", 64, 62, { width: pageWidth - 160 });
    doc.fillColor("#7fb3b3").fontSize(9).font("Helvetica")
      .text("Flight Lyceum", 64, 83, { width: pageWidth - 160 });
    doc.fillColor("#ffffff").fontSize(9)
      .text(input.reportDate, 64, 83, { align: "right", width: pageWidth - 16 });

    doc.moveDown(3);

    // ── School + summary line ────────────────────────────────────────────────
    doc.fillColor(BRAND_DARK).fontSize(11).font("Helvetica-Bold")
      .text(input.schoolName, 48, doc.y);
    doc.fillColor("#374151").fontSize(10).font("Helvetica")
      .text(`${input.findingCount} regulation change${input.findingCount === 1 ? "" : "s"} detected and queued for review.`, { continued: false });

    doc.moveDown(0.8);

    // ── Risk breakdown pills ────────────────────────────────────────────────
    const riskCounts = countByRisk(input.findings);
    let pillX = 48;
    for (const [label, color] of Object.entries(RISK_COLORS)) {
      const count = riskCounts[label as keyof typeof riskCounts];
      const pillText = `${label}: ${count}`;
      const pillW = 80;
      doc.roundedRect(pillX, doc.y, pillW, 18, 4).fill(color);
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
        .text(pillText, pillX, doc.y - 14, { width: pillW, align: "center" });
      pillX += pillW + 10;
    }

    doc.moveDown(2.2);

    // ── Table header ────────────────────────────────────────────────────────
    const colWidths = [120, 220, 80];
    const colX = [48, 168, 388];
    const rowH = 22;
    const tableTop = doc.y;

    doc.rect(48, tableTop, pageWidth, rowH).fill("#f9fafb");
    doc.fillColor("#6b7280").fontSize(8).font("Helvetica-Bold");
    ["REG PART", "SECTION", "RISK"].forEach((label, i) => {
      doc.text(label, colX[i] + 6, tableTop + 7, { width: colWidths[i], lineBreak: false });
    });

    doc.moveTo(48, tableTop + rowH).lineTo(48 + pageWidth, tableTop + rowH)
      .strokeColor("#e5e7eb").lineWidth(0.5).stroke();

    // ── Table rows ──────────────────────────────────────────────────────────
    let rowY = tableTop + rowH;
    const rowsToRender = input.findings.slice(0, 50);

    for (const [idx, finding] of rowsToRender.entries()) {
      if (rowY + rowH > doc.page.height - 60) {
        doc.addPage();
        rowY = 48;
      }

      if (idx % 2 === 1) {
        doc.rect(48, rowY, pageWidth, rowH).fill("#f9fafb");
      }

      doc.fillColor("#1f3434").fontSize(9).font("Helvetica-Bold")
        .text(finding.regPart, colX[0] + 6, rowY + 7, { width: colWidths[0], lineBreak: false });
      doc.fillColor("#374151").font("Helvetica")
        .text(finding.sectionRef, colX[1] + 6, rowY + 7, { width: colWidths[1], lineBreak: false });

      const riskColor = RISK_COLORS[finding.riskLevel] ?? RISK_COLORS.Low;
      doc.roundedRect(colX[2] + 6, rowY + 5, 60, 13, 3).fill(riskColor);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8)
        .text(finding.riskLevel, colX[2] + 6, rowY + 8, { width: 60, align: "center", lineBreak: false });

      doc.moveTo(48, rowY + rowH).lineTo(48 + pageWidth, rowY + rowH)
        .strokeColor("#f3f4f6").lineWidth(0.5).stroke();

      rowY += rowH;
    }

    if (input.findings.length > 50) {
      doc.moveDown(0.5);
      doc.fillColor("#6b7280").fontSize(9).font("Helvetica")
        .text(`… and ${input.findings.length - 50} more. Log in to Flight Lyceum to see all.`, 48);
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 36;
    doc.moveTo(48, footerY - 6).lineTo(48 + pageWidth, footerY - 6)
      .strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    doc.fillColor("#9ca3af").fontSize(8).font("Helvetica")
      .text("Generated by Flight Lyceum · EASA Compliance Monitoring", 48, footerY, { align: "left", width: pageWidth })
      .text(input.reportDate, 48, footerY, { align: "right", width: pageWidth });

    doc.end();
  });
}
