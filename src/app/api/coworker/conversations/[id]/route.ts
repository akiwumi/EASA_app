import { NextResponse } from "next/server";
import {
  archiveOwnedConversation,
  deleteArchivedOwnedConversation,
  restoreOwnedConversation,
} from "@/lib/coworker/conversations";
import { isUuid } from "@/lib/coworker/request-validation";
import { getOrgAccessContext } from "@/lib/supabase/access";

type ConversationLifecycleAction = "archive" | "restore";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function serverError(error: unknown) {
  console.error("Coworker conversation lifecycle request failed", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}

async function parseAction(request: Request): Promise<ConversationLifecycleAction | null> {
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return null;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { action } = body as Record<string, unknown>;
  return action === "archive" || action === "restore" ? action : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgAccessContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isUuid(id)) return notFound();

    const action = await parseAction(request);
    if (!action) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const conversation = action === "archive"
      ? await archiveOwnedConversation(ctx, id)
      : await restoreOwnedConversation(ctx, id);
    if (!conversation) return notFound();

    return NextResponse.json({ conversation });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgAccessContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isUuid(id)) return notFound();

    const conversation = await deleteArchivedOwnedConversation(ctx, id);
    if (!conversation) return notFound();

    return NextResponse.json({ ok: true, id: conversation.id });
  } catch (error) {
    return serverError(error);
  }
}
