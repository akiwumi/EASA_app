import FlightbookUpload from "@/components/flightbooks/FlightbookUpload";
import { getOptionalSupabaseAdminClient, getOrgAccessContext } from "@/lib/supabase/access";

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

  const admin = getOptionalSupabaseAdminClient();
  if (!admin) return [];

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
