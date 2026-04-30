import type { RetrievedChunk } from "@/lib/ai/retrieval";

export const GENERATION_PROMPT_VERSION = "rag-v1";

type PromptInput = {
  updateTitle: string;
  updateSummary: string;
  findingSummary: string;
  regPart: string;
  primaryFlightbook: RetrievedChunk;
  regulationChunks: RetrievedChunk[];
  flightbookChunks: RetrievedChunk[];
  notes?: string[];
};

export type GeneratedDraft = {
  suggestedText: string;
  changeSummary: string;
  whyThisSection: string;
  confidence: string;
  citations: { kind: string; id: string; reason?: string }[];
};

export function buildRevisionPrompt(input: PromptInput) {
  const regulationContext = input.regulationChunks
    .map((chunk, index) => {
      const label = [chunk.sectionNumber, chunk.title].filter(Boolean).join(" — ");
      return [
        `[REG-${index + 1}] id=${chunk.id} score=${chunk.score.toFixed(3)}`,
        label || "(untitled regulation chunk)",
        chunk.body,
      ].join("\n");
    })
    .join("\n\n");

  const flightbookContext = input.flightbookChunks
    .map((chunk, index) => {
      const label = [chunk.sectionNumber, chunk.title].filter(Boolean).join(" — ");
      return [
        `[BOOK-${index + 1}] id=${chunk.id} score=${chunk.score.toFixed(3)} book=${chunk.flightbookName ?? "Unknown"}`,
        label || "(untitled flightbook chunk)",
        chunk.body,
      ].join("\n");
    })
    .join("\n\n");

  const primaryLabel = [input.primaryFlightbook.sectionNumber, input.primaryFlightbook.title]
    .filter(Boolean)
    .join(" — ");

  return `You are a compliance writer for an aviation flight school.

Use only the provided evidence to draft a compliant update to the flightbook section.
Do not invent regulatory requirements that are not supported by the retrieved regulation chunks.
Preserve the style and section numbering of the current flightbook section.

Return a single JSON object with these keys:
- suggestedText: the revised full section text
- changeSummary: 1 short sentence describing what changed
- whyThisSection: 1 short sentence explaining why this section was chosen
- confidence: "high", "medium", or "low"
- citations: array of objects with keys kind, id, reason

REGULATION FAMILY
${input.regPart}

UPDATE TITLE
${input.updateTitle}

UPDATE SUMMARY
${input.updateSummary || "(no source summary available)"}

AI FINDING SUMMARY
${input.findingSummary || "(no finding summary available)"}

CURRENT PRIMARY FLIGHTBOOK SECTION
Book: ${input.primaryFlightbook.flightbookName ?? "Unknown"}
Section: ${primaryLabel || "(untitled section)"}
Section ID: ${input.primaryFlightbook.id}

${input.primaryFlightbook.body}

RETRIEVED REGULATION EVIDENCE
${regulationContext || "(no regulation chunks retrieved)"}

RETRIEVED FLIGHTBOOK CONTEXT
${flightbookContext || "(no additional flightbook chunks retrieved)"}

${input.notes && input.notes.length > 0 ? `EDITOR NOTES\n${input.notes.map((note, index) => `${index + 1}. ${note}`).join("\n")}\n` : ""}
Return only valid JSON.`;
}

export function extractGeneratedDraft(text: string): GeneratedDraft | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<GeneratedDraft>;
    if (!parsed.suggestedText) return null;
    return {
      suggestedText: String(parsed.suggestedText),
      changeSummary: String(parsed.changeSummary ?? ""),
      whyThisSection: String(parsed.whyThisSection ?? ""),
      confidence: String(parsed.confidence ?? "medium"),
      citations: Array.isArray(parsed.citations)
        ? parsed.citations.map((citation) => ({
            kind: String((citation as { kind?: string }).kind ?? "unknown"),
            id: String((citation as { id?: string }).id ?? ""),
            reason: String((citation as { reason?: string }).reason ?? ""),
          }))
        : [],
    };
  } catch {
    return null;
  }
}
