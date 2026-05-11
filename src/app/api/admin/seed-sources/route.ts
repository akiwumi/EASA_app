import { NextResponse } from "next/server";
import { getOrgAdminContext } from "@/lib/supabase/access";
import { seedDefaultSources } from "@/lib/seed-default-sources";

// POST /api/admin/seed-sources — ensure default org and EASA feeds exist
export async function POST() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { inserted, skipped } = await seedDefaultSources();
  return NextResponse.json({ ok: true, inserted, activated: skipped });
}
