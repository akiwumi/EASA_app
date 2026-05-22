import { NextResponse } from "next/server";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";
import { generateDraftsForOrg } from "@/lib/ai/proposed-updates";

export async function POST(req: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let limit = 20;
  try {
    const body = await req.json() as { limit?: number };
    if (typeof body.limit === "number" && body.limit > 0) {
      limit = Math.min(body.limit, 100);
    }
  } catch {
    // no body or invalid JSON — use defaults
  }

  const admin = getSupabaseAdminClient();
  const result = await generateDraftsForOrg(admin, ctx.orgId, limit);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    generated: result.generated,
    attempted: result.attempted,
    errors: result.errors,
  });
}
