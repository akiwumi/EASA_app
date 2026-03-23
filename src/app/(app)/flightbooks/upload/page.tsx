import { createClient } from "@supabase/supabase-js";
import FlightbookUpload from "@/components/flightbooks/FlightbookUpload";

async function loadBooks() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await admin
    .from("flightbooks")
    .select("id, name, doc_type")
    .order("name");
  return (data ?? []) as { id: string; name: string; doc_type: string }[];
}

export default async function FlightbookUploadPage() {
  const books = await loadBooks();
  return <FlightbookUpload existingBooks={books} />;
}
