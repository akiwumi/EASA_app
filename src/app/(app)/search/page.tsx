import { redirect } from "next/navigation";
import SearchClient from "@/components/search/SearchClient";
import { loadSearchPageData } from "@/services/search";

export default async function SearchPage() {
  const data = await loadSearchPageData();
  if (!data) {
    redirect("/login");
  }

  return <SearchClient data={data} />;
}
