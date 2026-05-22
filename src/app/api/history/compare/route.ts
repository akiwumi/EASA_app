import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

// GET /api/history/compare?v1=uuid&v2=uuid
// Returns the body + metadata for two flightbook_section_versions
export async function GET(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const v1 = searchParams.get("v1");
  const v2 = searchParams.get("v2");

  if (!v1 || !v2) {
    return NextResponse.json({ error: "v1 and v2 version IDs required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("flightbook_section_versions")
    .select(`
      id,
      version_number,
      change_source,
      created_at,
      body,
      flightbook_section_id,
      flightbook_sections (
        section_number,
        title,
        flightbooks ( name )
      )
    `)
    .in("id", [v1, v2])
    .eq("organization_id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data || data.length < 2) {
    return NextResponse.json({ error: "One or both versions not found" }, { status: 404 });
  }

  // Unwrap nested joins
  const versions = data.map((v) => {
    const sec = Array.isArray(v.flightbook_sections)
      ? v.flightbook_sections[0]
      : v.flightbook_sections;
    const fb = sec
      ? Array.isArray((sec as Record<string, unknown>).flightbooks)
        ? ((sec as Record<string, unknown>).flightbooks as { name?: string }[])[0]
        : (sec as Record<string, unknown>).flightbooks
      : null;
    return {
      id: v.id as string,
      versionNumber: v.version_number as number,
      changeSource: v.change_source as string,
      createdAt: v.created_at as string,
      body: v.body as string,
      flightbookSectionId: v.flightbook_section_id as string,
      sectionNumber: ((sec as Record<string, unknown> | null)?.section_number as string | null) ?? null,
      sectionTitle: ((sec as Record<string, unknown> | null)?.title as string | null) ?? null,
      flightbookName: ((fb as Record<string, unknown> | null)?.name as string | null) ?? null,
    };
  });

  // Sort so v1 is first
  const ordered = [
    versions.find((v) => v.id === v1)!,
    versions.find((v) => v.id === v2)!,
  ];

  if (ordered[0].flightbookSectionId !== ordered[1].flightbookSectionId) {
    return NextResponse.json(
      { error: "Select two versions of the same section to compare." },
      { status: 400 },
    );
  }

  return NextResponse.json({ versions: ordered });
}
