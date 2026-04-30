import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// GET /api/history/compare?v1=uuid&v2=uuid
// Returns the body + metadata for two flightbook_section_versions
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const v1 = searchParams.get("v1");
  const v2 = searchParams.get("v2");

  if (!v1 || !v2) {
    return NextResponse.json({ error: "v1 and v2 version IDs required" }, { status: 400 });
  }

  const admin = getAdminClient();

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
    .in("id", [v1, v2]);

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

  return NextResponse.json({ versions: ordered });
}
