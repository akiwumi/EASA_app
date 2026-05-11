import { redirect } from "next/navigation";
import { ProposedUpdatesPanel } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadDashboardSetupSummary,
  loadFlightbookMappingRows,
  loadLastRssIngestAt,
  loadOrgContext,
  loadUpdateQueuePreview,
} from "@/services/dashboard";

export default async function DashboardProposedUpdatesPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const [queuePreview, mappingRows, lastRssAt, setupSummary] = await Promise.all([
    loadUpdateQueuePreview(org.organizationId, 10),
    loadFlightbookMappingRows(org.organizationId),
    loadLastRssIngestAt(org.organizationId),
    loadDashboardSetupSummary(org.organizationId),
  ]);
  const isEmptyWorkspace =
    queuePreview.length === 0 &&
    mappingRows.length === 0 &&
    !lastRssAt &&
    !setupSummary.hasFlightbooks;

  return (
    <ProposedUpdatesPanel
      queuePreview={queuePreview}
      isEmptyWorkspace={isEmptyWorkspace}
    />
  );
}
