import { NextResponse } from "next/server";
import { listArchivedConversations } from "@/lib/coworker/conversations";
import { getOrgAccessContext } from "@/lib/supabase/access";

function serverError(error: unknown) {
  console.error("Coworker conversation archive request failed", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const ctx = await getOrgAccessContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversations = await listArchivedConversations(ctx);
    return NextResponse.json({ conversations });
  } catch (error) {
    return serverError(error);
  }
}
