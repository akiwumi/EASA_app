import { NextResponse } from "next/server";
import { getSupabaseAdminClient, DEFAULT_ORG_ID } from "@/lib/supabase/access";
import { buildReviewPreview } from "@/lib/ai/review-preview";

export async function POST(request: Request) {
  try {
    const { findingId, flightbookId } = (await request.json()) as {
      findingId?: string;
      flightbookId?: string;
    };

    if (!findingId) {
      return NextResponse.json({ error: "findingId required" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const result = await buildReviewPreview(admin, {
      findingId,
      flightbookId: flightbookId ?? null,
      defaultOrgId: DEFAULT_ORG_ID,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result.data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while loading review context.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
