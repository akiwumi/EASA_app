import { redirect } from "next/navigation";
import { RssIngestionPanel } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadLastRssIngestAt,
  loadOrgContext,
  loadRssSourceUrls,
} from "@/services/dashboard";

export default async function DashboardRssIngestionPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const [rssUrls, lastRssAt] = await Promise.all([
    loadRssSourceUrls(org.organizationId),
    loadLastRssIngestAt(org.organizationId),
  ]);

  return <RssIngestionPanel rssUrls={rssUrls} lastRssAt={lastRssAt} />;
}
