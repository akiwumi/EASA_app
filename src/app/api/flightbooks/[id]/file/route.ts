import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

// GET /api/flightbooks/[id]/file — download the original uploaded file from Storage
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = getSupabaseAdminClient();

  const { data: book } = await admin
    .from("flightbooks")
    .select("id, name, file_ref, file_content_type")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (!book) return NextResponse.json({ error: "Flight book not found" }, { status: 404 });
  if (!book.file_ref) return NextResponse.json({ error: "No original file stored for this flight book" }, { status: 404 });

  const { data: storageObject, error: storageErr } = await admin.storage
    .from("flightbooks")
    .download(book.file_ref as string);

  if (storageErr || !storageObject) {
    return NextResponse.json({ error: storageErr?.message ?? "File not found in storage" }, { status: 404 });
  }

  const bytes = await storageObject.arrayBuffer();
  const fileRef = book.file_ref as string;
  const originalFilename = fileRef.split("/").pop()?.replace(/^\d+_/, "") ?? `${book.name}.pdf`;
  const contentType = (book.file_content_type as string | null) ?? "application/octet-stream";

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${originalFilename}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
