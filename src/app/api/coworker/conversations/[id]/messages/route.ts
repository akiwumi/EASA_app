import { NextResponse } from "next/server";
import { listMessages } from "@/lib/coworker/conversations";
import { orchestrateCoworkerMessage } from "@/lib/coworker/orchestrate-message";
import {
  ConversationRequestValidationError,
  isUuid,
  parseCoworkerMessageRequest,
} from "@/lib/coworker/request-validation";
import { getOrgAccessContext } from "@/lib/supabase/access";

function serverError(error: unknown) {
  console.error("Coworker messages request failed", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgAccessContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const messages = await listMessages(ctx, id);
    if (!messages) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ messages });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrgAccessContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const input = parseCoworkerMessageRequest(await request.text());
    const result = await orchestrateCoworkerMessage(ctx, id, input);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.response);
  } catch (error) {
    if (error instanceof ConversationRequestValidationError) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    return serverError(error);
  }
}
