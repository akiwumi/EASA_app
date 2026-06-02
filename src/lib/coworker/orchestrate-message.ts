import type {
  CoworkerCard,
  CoworkerCitation,
  CoworkerIntent,
  CoworkerResponse,
} from "./response-types";
import type { OrgAccessContext } from "@/lib/supabase/access";

type CoworkerContext = OrgAccessContext;

type CoworkerMessageInput = {
  content: string;
  findingId?: string | null;
};

type ToolResult = {
  content: string;
  citations: CoworkerCitation[];
  cards: CoworkerCard[];
};

type InsertInput = {
  conversationId: string;
  role: "user" | "assistant";
  intent?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
};

type OrchestrationDeps = {
  loadOwnedConversation: (ctx: CoworkerContext, conversationId: string) => Promise<unknown>;
  insertMessage: (ctx: CoworkerContext, input: InsertInput) => Promise<{ id: string } | null>;
  classifyCoworkerIntent: (
    content: string,
    context?: { findingId?: string | null },
  ) => { intent: CoworkerIntent } | Promise<{ intent: CoworkerIntent }>;
  answerManualQuestion: (content: string) => Promise<ToolResult>;
  listPendingFindings: (ctx: CoworkerContext) => Promise<ToolResult>;
  explainFinding: (ctx: CoworkerContext, findingId: string) => Promise<ToolResult>;
  previewDraftUpdate: (ctx: CoworkerContext, findingId: string) => Promise<ToolResult>;
  logError: (message: string, error: unknown) => void;
};

type OrchestrationResult =
  | { ok: true; response: CoworkerResponse }
  | { ok: false; error: string; status: 404 | 500 };

const UNSUPPORTED_CONTENT =
  "I can research, explain, and prepare a draft. Open the review item to approve or reject a change.";
const RECOVERABLE_ERROR_CONTENT =
  "I could not complete that request. Please try again.";
const EMPTY_TOOL_RESULT: ToolResult = {
  content: UNSUPPORTED_CONTENT,
  citations: [],
  cards: [],
};

const defaultDeps: OrchestrationDeps = {
  loadOwnedConversation: async (ctx, conversationId) => {
    const { loadOwnedConversation } = await import("./conversations");
    return loadOwnedConversation(ctx, conversationId);
  },
  insertMessage: async (ctx, input) => {
    const { insertMessage } = await import("./conversations");
    return insertMessage(ctx, input);
  },
  classifyCoworkerIntent: (content, context) => {
    return import("./classify-intent").then(({ classifyCoworkerIntent }) =>
      classifyCoworkerIntent(content, context),
    );
  },
  answerManualQuestion: async (content) => {
    const { answerManualQuestion } = await import("./tools");
    return answerManualQuestion(content);
  },
  listPendingFindings: async (ctx) => {
    const { listPendingFindings } = await import("./tools");
    return listPendingFindings(ctx);
  },
  explainFinding: async (ctx, findingId) => {
    const { explainFinding } = await import("./tools");
    return explainFinding(ctx, findingId);
  },
  previewDraftUpdate: async (ctx, findingId) => {
    const { previewDraftUpdate } = await import("./tools");
    return previewDraftUpdate(ctx, findingId);
  },
  logError: (message, error) => console.error(message, error),
};

async function runApprovedTool(
  deps: OrchestrationDeps,
  ctx: CoworkerContext,
  input: CoworkerMessageInput,
  intent: CoworkerIntent,
): Promise<ToolResult> {
  switch (intent) {
    case "manual_question":
      return deps.answerManualQuestion(input.content);
    case "list_pending_findings":
      return deps.listPendingFindings(ctx);
    case "explain_finding":
      return input.findingId
        ? deps.explainFinding(ctx, input.findingId)
        : EMPTY_TOOL_RESULT;
    case "preview_draft_update":
      return input.findingId
        ? deps.previewDraftUpdate(ctx, input.findingId)
        : EMPTY_TOOL_RESULT;
    case "unsupported":
      return EMPTY_TOOL_RESULT;
  }
}

export async function orchestrateCoworkerMessage(
  ctx: CoworkerContext,
  conversationId: string,
  input: CoworkerMessageInput,
  deps: OrchestrationDeps = defaultDeps,
): Promise<OrchestrationResult> {
  let userMessageSaved = false;
  let intent: CoworkerIntent = "unsupported";

  try {
    const conversation = await deps.loadOwnedConversation(ctx, conversationId);
    if (!conversation) return { ok: false, error: "Not found", status: 404 };

    const userMessage = await deps.insertMessage(ctx, {
      conversationId,
      role: "user",
      content: input.content,
    });
    if (!userMessage) throw new Error("Unable to save coworker user message");
    userMessageSaved = true;

    ({ intent } = await deps.classifyCoworkerIntent(input.content, {
      findingId: input.findingId,
    }));
    if (
      !input.findingId &&
      (intent === "explain_finding" || intent === "preview_draft_update")
    ) {
      intent = "unsupported";
    }
    const toolResult = await runApprovedTool(deps, ctx, input, intent);
    const assistantMessage = await deps.insertMessage(ctx, {
      conversationId,
      role: "assistant",
      intent,
      content: toolResult.content,
      metadata: {
        citations: toolResult.citations,
        cards: toolResult.cards,
      },
    });
    if (!assistantMessage) throw new Error("Unable to save coworker assistant message");

    return {
      ok: true,
      response: {
        conversationId,
        messageId: assistantMessage.id,
        intent,
        content: toolResult.content,
        citations: toolResult.citations,
        cards: toolResult.cards,
      },
    };
  } catch (error) {
    deps.logError("Coworker message orchestration failed", error);
    if (userMessageSaved) {
      try {
        await deps.insertMessage(ctx, {
          conversationId,
          role: "assistant",
          intent,
          content: RECOVERABLE_ERROR_CONTENT,
          metadata: { citations: [], cards: [] },
        });
      } catch (recoveryError) {
        deps.logError("Coworker recoverable assistant message save failed", recoveryError);
      }
    }
    return { ok: false, error: "Internal server error", status: 500 };
  }
}
