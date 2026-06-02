import { NextResponse } from "next/server";
import { listMessages } from "@/lib/coworker/conversations";
import { isUuid } from "@/lib/coworker/request-validation";
import { getOrgAccessContext } from "@/lib/supabase/access";

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
    console.error("Coworker messages request failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
