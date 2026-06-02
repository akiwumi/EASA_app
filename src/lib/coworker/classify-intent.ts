import type { CoworkerIntent } from "./response-types.ts";

interface CoworkerIntentContext {
  findingId?: string | null;
}

const mutationVerb = "(?:approve|reject|apply|publish|delete|update|edit|trigger|send|remove|create)";
const mutationGerund =
  "(?:approving|rejecting|applying|publishing|deleting|updating|editing|triggering|sending|removing|creating)";
const politePrefix = "(?:(?:please|kindly),?\\s+)?";
const goAhead = "(?:go ahead and\\s+)?";

function isMutationCommand(normalizedText: string): boolean {
  return [
    new RegExp(`^${politePrefix}${goAhead}${mutationVerb}\\b`),
    new RegExp(`^(?:can|could|would|will)\\s+you\\s+${politePrefix}${goAhead}${mutationVerb}\\b`),
    new RegExp(`^i want you to\\s+${mutationVerb}\\b`),
    new RegExp(`^would you mind\\s+${mutationGerund}\\b`),
  ].some((pattern) => pattern.test(normalizedText));
}

export function classifyCoworkerIntent(
  text: string,
  context?: CoworkerIntentContext,
): { intent: CoworkerIntent } {
  const normalizedText = text.trim().toLowerCase();

  if (isMutationCommand(normalizedText)) {
    return { intent: "unsupported" };
  }

  if (context?.findingId && /\b(?:draft|wording|rewrite|revise|revised)\b/.test(normalizedText)) {
    return { intent: "preview_draft_update" };
  }

  if (context?.findingId && /\b(?:explain|why|affect|impact)\b/.test(normalizedText)) {
    return { intent: "explain_finding" };
  }

  if (/\b(?:pending|queue|findings|attention)\b|\breview items\b/.test(normalizedText)) {
    return { intent: "list_pending_findings" };
  }

  if (normalizedText.length >= 2) {
    return { intent: "manual_question" };
  }

  return { intent: "unsupported" };
}
