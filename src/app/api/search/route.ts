import { NextResponse } from "next/server";
import { runSearch } from "@/services/search";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    query?: string;
    programmeId?: string | null;
    phaseId?: string | null;
    flightbookId?: string | null;
    documentType?: string | null;
    includeAnswer?: boolean;
  };

  const result = await runSearch({
    query: body.query ?? "",
    programmeId: body.programmeId ?? null,
    phaseId: body.phaseId ?? null,
    flightbookId: body.flightbookId ?? null,
    documentType: body.documentType ?? null,
    includeAnswer: body.includeAnswer ?? true,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
