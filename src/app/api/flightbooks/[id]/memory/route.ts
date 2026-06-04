import { NextResponse } from "next/server";
import {
  runFlightbookMemoryAnalysis,
  summarizeMemoryStatus,
} from "@/lib/ai/memory";
import { isUuid } from "@/lib/coworker/request-validation";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

async function loadOwnedFlightbook(admin: ReturnType<typeof getSupabaseAdminClient>, orgId: string, id: string) {
  const { data, error } = await admin
    .from("flightbooks")
    .select("id")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid flight book id" }, { status: 400 });

  try {
    const admin = getSupabaseAdminClient();
    const flightbook = await loadOwnedFlightbook(admin, ctx.orgId, id);
    if (!flightbook) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const status = await summarizeMemoryStatus(admin, {
      organizationId: ctx.orgId,
      flightbookId: id,
    });

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Flightbook memory status failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid flight book id" }, { status: 400 });

  try {
    const admin = getSupabaseAdminClient();
    const flightbook = await loadOwnedFlightbook(admin, ctx.orgId, id);
    if (!flightbook) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await runFlightbookMemoryAnalysis(admin, {
      organizationId: ctx.orgId,
      flightbookId: id,
      scope: "manual_reanalysis",
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Unable to analyze flight book memory." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Flightbook memory analysis failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
