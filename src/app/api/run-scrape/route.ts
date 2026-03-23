import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Supabase server credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 400 },
    );
  }

  const supabase = createClient(url, serviceRoleKey);

  const { data: ingestData, error: ingestError } =
    await supabase.functions.invoke("rss-ingest");

  if (ingestError) {
    return NextResponse.json(
      { ok: false, error: ingestError.message },
      { status: 500 },
    );
  }

  const { data: analyzeData, error: analyzeError } =
    await supabase.functions.invoke("ai-analyze");

  if (analyzeError) {
    return NextResponse.json(
      { ok: false, error: analyzeError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    ingest: ingestData ?? null,
    analyze: analyzeData ?? null,
  });
}
