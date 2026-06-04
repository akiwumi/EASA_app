import { buildReviewPreview } from "@/lib/ai/review-preview";
import { generateDraftPreviewForFinding } from "@/lib/ai/proposed-update-preview";
import { retrieveFlightbookMemories } from "@/lib/ai/memory";
import {
  getSupabaseAdminClient,
  type OrgAccessContext,
} from "@/lib/supabase/access";
import { runSearch } from "@/services/search";
import type { CoworkerCard, CoworkerCitation } from "./response-types";

const MISSING_EVIDENCE = "I could not find enough stored evidence to answer that.";

type CoworkerToolResult = {
  content: string;
  citations: CoworkerCitation[];
  cards: CoworkerCard[];
};

function unwrapMaybeArray<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isMissingSchemaError(
  error: { code?: string | null; message?: string | null } | null | undefined,
) {
  return (
    ["PGRST200", "PGRST205", "42P01", "42703"].includes(error?.code ?? "") ||
    /could not find (?:a |the )?(?:relationship|table|column)/i.test(error?.message ?? "") ||
    /relation .* does not exist/i.test(error?.message ?? "")
  );
}

async function loadOwnedFinding(ctx: OrgAccessContext, findingId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("ai_findings")
    .select("id, organization_id, summary")
    .eq("id", findingId)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function answerManualQuestion(
  ctx: OrgAccessContext,
  query: string,
): Promise<CoworkerToolResult> {
  const admin = getSupabaseAdminClient();
  const memories = await retrieveFlightbookMemories(admin, {
    organizationId: ctx.orgId,
    queryText: query,
    limit: 4,
  });
  const memorySummary = memories
    .map((memory, index) => {
      const section = [memory.sectionNumber, memory.sectionTitle].filter(Boolean).join(" ");
      return `${index + 1}. ${memory.title}${section ? ` (${section})` : ""}: ${memory.content}`;
    })
    .join("\n");
  const result = await runSearch({ query, includeAnswer: true });
  if ("error" in result || !result.answer.text) {
    if (memories.length === 0) return { content: MISSING_EVIDENCE, citations: [], cards: [] };
    return {
      content: `From stored flight book memory:\n\n${memorySummary}`,
      citations: memories.map((memory) => ({
        label: memory.sectionTitle ?? memory.title,
        href: memory.flightbookId && memory.flightbookSectionId
          ? `/flightbooks/${memory.flightbookId}#section-${memory.flightbookSectionId}`
          : "/flightbooks",
        excerpt: memory.content,
      })),
      cards: [],
    };
  }

  return {
    content: memories.length > 0
      ? `${result.answer.text}\n\nStored flight book memory:\n${memorySummary}`
      : result.answer.text,
    citations: [
      ...result.answer.citations.map((citation) => ({
      label: citation.secondaryLabel
        ? `${citation.label} | ${citation.secondaryLabel}`
        : citation.label,
      href: citation.href,
      excerpt: citation.excerpt,
      })),
      ...memories.map((memory) => ({
        label: memory.sectionTitle ?? memory.title,
        href: memory.flightbookId && memory.flightbookSectionId
          ? `/flightbooks/${memory.flightbookId}#section-${memory.flightbookSectionId}`
          : "/flightbooks",
        excerpt: memory.content,
      })),
    ],
    cards: [],
  };
}

export async function listPendingFindings(ctx: OrgAccessContext): Promise<CoworkerToolResult> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("proposed_updates")
    .select(`
      id,
      ai_rationale,
      created_at,
      reg_changes (
        ai_finding_id,
        ai_findings (
          id,
          organization_id,
          summary,
          rss_items ( title )
        )
      )
    `)
    .eq("organization_id", ctx.orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    if (isMissingSchemaError(error)) {
      return { content: MISSING_EVIDENCE, citations: [], cards: [] };
    }
    throw error;
  }

  const cards = (data ?? []).flatMap((row) => {
    const regChange = unwrapMaybeArray(row.reg_changes);
    const finding = unwrapMaybeArray(regChange?.ai_findings);
    if (finding?.organization_id !== ctx.orgId) return [];
    const rss = unwrapMaybeArray(finding?.rss_items);
    const findingId = safeText(regChange?.ai_finding_id ?? finding?.id, "");
    if (!findingId) return [];

    return [{
      type: "finding" as const,
      findingId,
      title: safeText(rss?.title, "Pending compliance finding"),
      summary: safeText(finding?.summary ?? row.ai_rationale, "Review stored finding details."),
      href: `/results/${findingId}`,
    }];
  });

  return {
    content: cards.length ? `${cards.length} pending finding${cards.length === 1 ? "" : "s"} need review.` : MISSING_EVIDENCE,
    citations: [],
    cards,
  };
}

export async function explainFinding(
  ctx: OrgAccessContext,
  findingId: string,
): Promise<CoworkerToolResult> {
  const ownedFinding = await loadOwnedFinding(ctx, findingId);
  if (!ownedFinding) return { content: MISSING_EVIDENCE, citations: [], cards: [] };

  const admin = getSupabaseAdminClient();
  const preview = await buildReviewPreview(admin, {
    findingId,
    defaultOrgId: ctx.orgId,
  });
  if (!preview.ok) return { content: MISSING_EVIDENCE, citations: [], cards: [] };

  return {
    content: `${safeText(ownedFinding.summary, "Stored finding")}\n\n${preview.data.whyThisSection}`,
    citations: preview.data.sourceCitations.map((citation) => ({
      label: safeText(citation.title ?? citation.section_number, "Stored evidence"),
      href: `/results/${findingId}`,
      excerpt: safeText(citation.quote, "Stored evidence"),
    })),
    cards: [{
      type: "finding",
      findingId,
      title: safeText(preview.data.trigger.title, "Compliance finding"),
      summary: safeText(ownedFinding.summary, preview.data.whyThisSection),
      href: `/results/${findingId}`,
    }],
  };
}

export async function previewDraftUpdate(
  ctx: OrgAccessContext,
  findingId: string,
): Promise<CoworkerToolResult> {
  const ownedFinding = await loadOwnedFinding(ctx, findingId);
  if (!ownedFinding) return { content: MISSING_EVIDENCE, citations: [], cards: [] };

  const admin = getSupabaseAdminClient();
  const preview = await generateDraftPreviewForFinding(admin, {
    organizationId: ctx.orgId,
    findingId,
  });
  if (!preview.ok) return { content: MISSING_EVIDENCE, citations: [], cards: [] };

  return {
    content: "Draft only. Nothing has been saved.",
    citations: preview.data.citations.map((citation) => ({
      label: safeText(citation.title ?? citation.section_number, "Stored evidence"),
      href: `/results/${findingId}`,
      excerpt: safeText(citation.quote, "Stored evidence"),
    })),
    cards: [{
      type: "draft",
      findingId,
      sectionId: preview.data.sectionId,
      title: `Draft: ${safeText(preview.data.sectionTitle, "Flight book update")}`,
      currentText: preview.data.currentBody,
      proposedText: preview.data.suggestedText,
      rationale: safeText(preview.data.changeSummary, preview.data.whyThisSection),
    }],
  };
}
