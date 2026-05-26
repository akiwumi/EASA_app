import { redirect } from "next/navigation";
import SearchClient from "@/components/search/SearchClient";
import { loadSearchPageData } from "@/services/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const data = await loadSearchPageData();
  if (!data) {
    redirect("/login");
  }

  const params = await searchParams;
  const initialQuery = params.q ?? "";

  return <SearchClient data={data} initialQuery={initialQuery} />;
}
