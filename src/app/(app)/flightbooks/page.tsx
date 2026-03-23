import { createClient } from "@supabase/supabase-js";
import FlightbooksBrowser from "@/components/flightbooks/FlightbooksBrowser";

async function loadBooks() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: books } = await admin
    .from("flightbooks")
    .select("id, name, doc_type, version_label, active, created_at")
    .order("created_at", { ascending: false });

  if (!books?.length) return [];

  const { data: counts } = await admin
    .from("flightbook_sections")
    .select("flightbook_id")
    .in("flightbook_id", books.map((b) => b.id));

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    countMap.set(row.flightbook_id, (countMap.get(row.flightbook_id) ?? 0) + 1);
  }

  return books.map((b) => ({ ...b, sectionCount: countMap.get(b.id) ?? 0 }));
}

export default async function FlightbooksPage() {
  const books = await loadBooks();
  return <FlightbooksBrowser books={books} />;
}
