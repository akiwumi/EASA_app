import { redirect } from "next/navigation";
import { TimeMachinePanel } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadOrgContext,
  loadRecentSectionVersions,
} from "@/services/dashboard";

export default async function DashboardTimeMachinePage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const entries = await loadRecentSectionVersions(org.organizationId, 20);

  return <TimeMachinePanel entries={entries} />;
}
