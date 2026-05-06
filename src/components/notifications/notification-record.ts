export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read: boolean;
  created_at: string;
}

function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function parseNotificationRecord(payload: unknown): NotificationRecord | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const row = payload as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.type !== "string" ||
    typeof row.title !== "string" ||
    typeof row.read !== "boolean" ||
    typeof row.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: asNullableString(row.body),
    related_entity_type: asNullableString(row.related_entity_type),
    related_entity_id: asNullableString(row.related_entity_id),
    read: row.read,
    created_at: row.created_at,
  };
}
