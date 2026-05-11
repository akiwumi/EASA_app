import { redirect } from "next/navigation";
import { OperationsPanel } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadDashboardOperationalStats,
  loadDashboardRoleFocus,
  loadOrgContext,
  loadRecentPipelineRun,
} from "@/services/dashboard";

export default async function DashboardOperationsPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const [operationalStats, roleFocus, pipeline] = await Promise.all([
    loadDashboardOperationalStats(org.organizationId, org.userId),
    loadDashboardRoleFocus(org.organizationId, org.userId),
    loadRecentPipelineRun(org.organizationId),
  ]);

  return (
    <OperationsPanel
      org={org}
      operationalStats={operationalStats}
      roleFocus={roleFocus}
      pipeline={pipeline}
    />
  );
}
