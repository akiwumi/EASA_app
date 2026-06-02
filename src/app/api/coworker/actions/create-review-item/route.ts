import { NextResponse } from "next/server";
import { loadOwnedConversation, loadOwnedMessage } from "@/lib/coworker/conversations";
import { isUuid } from "@/lib/coworker/request-validation";
import { queueFinding } from "@/lib/findings/queue-finding";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgAccessContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = JSON.parse(await request.text());
    } catch {
      return notFound();
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) return notFound();

    const { findingId, conversationId, sourceMessageId } = body as Record<string, unknown>;
    if (
      typeof findingId !== "string" ||
      typeof conversationId !== "string" ||
      typeof sourceMessageId !== "string" ||
      !isUuid(findingId) ||
      !isUuid(conversationId) ||
      !isUuid(sourceMessageId)
    ) {
      return notFound();
    }

    const conversation = await loadOwnedConversation(ctx, conversationId);
    if (!conversation) return notFound();
    const sourceMessage = await loadOwnedMessage(ctx, conversationId, sourceMessageId);
    if (!sourceMessage) return notFound();

    const provenance = { conversationId, sourceMessageId };
    const admin = getSupabaseAdminClient();
    const result = await queueFinding(admin, ctx, findingId, true, provenance);
    if (result.error === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (result.error) {
      console.error("Coworker review item creation failed", result.error);
      return NextResponse.json({ error: "Unable to create review item." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      findingId: result.findingId,
      id: result.id,
      alreadyQueued: result.alreadyQueued,
      draftGenerated: result.draftGenerated,
      draftError: result.draftError ? "Unable to generate draft." : undefined,
    });
  } catch (error) {
    console.error("Coworker review item creation failed", error);
    return NextResponse.json({ error: "Unable to create review item." }, { status: 500 });
  }
}
