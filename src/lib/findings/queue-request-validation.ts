export class QueueFindingRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueueFindingRequestValidationError";
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function parseQueueFindingRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new QueueFindingRequestValidationError("request body must be an object");
  }

  const body = value as Record<string, unknown>;
  if (body.generateDraft !== undefined && typeof body.generateDraft !== "boolean") {
    throw new QueueFindingRequestValidationError("generateDraft must be a boolean");
  }
  if (body.generateDrafts !== undefined && typeof body.generateDrafts !== "boolean") {
    throw new QueueFindingRequestValidationError("generateDrafts must be a boolean");
  }
  const generateDraft = body.generateDraft ?? body.generateDrafts ?? false;

  if (body.findingIds !== undefined) {
    if (!Array.isArray(body.findingIds) || body.findingIds.length === 0) {
      throw new QueueFindingRequestValidationError("findingIds must be a non-empty array");
    }
    if (!body.findingIds.every((findingId) => typeof findingId === "string" && isUuid(findingId))) {
      throw new QueueFindingRequestValidationError("findingIds must contain valid UUIDs");
    }

    return {
      findingIds: Array.from(new Set(body.findingIds)).slice(0, 50),
      isBatch: true,
      generateDraft,
    };
  }

  if (typeof body.findingId !== "string" || !isUuid(body.findingId)) {
    throw new QueueFindingRequestValidationError("findingId must be a valid UUID");
  }

  return {
    findingIds: [body.findingId],
    isBatch: false,
    generateDraft,
  };
}
