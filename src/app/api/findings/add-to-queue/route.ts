import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import { queueFinding, type QueueFindingResult } from "@/lib/findings/queue-finding";
import {
  parseQueueFindingRequest,
  QueueFindingRequestValidationError,
} from "@/lib/findings/queue-request-validation";

function safeQueueError(error: string) {
  return [
    "Forbidden",
    "Finding not found",
    "Restore this result before adding it to the queue.",
  ].includes(error)
    ? error
    : "Unable to add finding to queue.";
}

function safeQueueResult(result: QueueFindingResult): QueueFindingResult {
  return {
    ...result,
    error: result.error ? safeQueueError(result.error) : undefined,
    draftError: result.draftError ? "Unable to generate draft." : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgAccessContext();
    if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let value: unknown;
    try {
      value = JSON.parse(await request.text());
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const body = parseQueueFindingRequest(value);
    const { findingIds, generateDraft } = body;

    const admin = getSupabaseAdminClient();
    const results: QueueFindingResult[] = [];

    for (const findingId of findingIds) {
      results.push(await queueFinding(admin, ctx, findingId, generateDraft));
    }

    const safeResults = results.map(safeQueueResult);
    const failed = safeResults.filter((result) => result.error);
    const queued = safeResults.filter((result) => result.id);

    if (body.isBatch) {
      return NextResponse.json({
        ok: failed.length === 0,
        queued: queued.length,
        failed: failed.length,
        results: safeResults,
      }, { status: queued.length > 0 ? 200 : 400 });
    }

    const result = safeResults[0];
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.error === "Forbidden" ? 403 : 400 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof QueueFindingRequestValidationError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Add to queue request failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
