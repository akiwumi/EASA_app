import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await request.text().catch(() => "");
  return NextResponse.json(
    { error: "Stripe webhook is disabled. School registration now uses built-in lifetime access." },
    { status: 410 },
  );
}
