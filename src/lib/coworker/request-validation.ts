export class ConversationRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConversationRequestValidationError";
  }
}

export function parseConversationRequestBody(rawText: string): { title?: unknown } {
  if (!rawText.trim()) return {};

  let value: unknown;
  try {
    value = JSON.parse(rawText);
  } catch {
    throw new ConversationRequestValidationError("request body must be valid JSON");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConversationRequestValidationError("request body must be an object");
  }

  return value as { title?: unknown };
}

export function parseConversationTitle(value: unknown) {
  if (value === undefined) return "New conversation";
  if (typeof value !== "string") {
    throw new ConversationRequestValidationError("title must be a string");
  }

  const title = value.trim();
  if (!title || title.length > 120) {
    throw new ConversationRequestValidationError(
      "title must contain between 1 and 120 characters",
    );
  }

  return title;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
