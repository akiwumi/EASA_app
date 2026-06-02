import { NextResponse } from "next/server";
import {
  createConversation,
  listConversations,
} from "@/lib/coworker/conversations";
import {
  ConversationRequestValidationError,
  parseConversationRequestBody,
  parseConversationTitle,
} from "@/lib/coworker/request-validation";
import { getOrgAccessContext } from "@/lib/supabase/access";

function serverError(error: unknown) {
  console.error("Coworker conversations request failed", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const ctx = await getOrgAccessContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversations = await listConversations(ctx);
    return NextResponse.json({ conversations });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgAccessContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = parseConversationRequestBody(await request.text());
    const title = parseConversationTitle(body.title);
    const conversation = await createConversation(ctx, title);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    if (error instanceof ConversationRequestValidationError) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    return serverError(error);
  }
}
