import { createClient } from "@supabase/supabase-js";
import FlightbookUpload from "@/components/flightbooks/FlightbookUpload";
import { getOrgAccessContext } from "@/lib/supabase/access";

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

async function loadBooks() {
  const ctx = await getOrgAccessContext();
  if (!ctx) {
    return [];
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data, error } = await admin
    .from("flightbooks")
    .select("id, name, doc_type")
    .eq("organization_id", ctx.orgId)
    .order("name");
  if (error && isMissingSchemaError(error)) {
    return [];
  }
  return (data ?? []) as { id: string; name: string; doc_type: string }[];
}

export default async function FlightbookUploadPage() {
  const books = await loadBooks();
  return <FlightbookUpload existingBooks={books} />;
}
