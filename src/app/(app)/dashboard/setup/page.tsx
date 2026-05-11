import { redirect } from "next/navigation";
import { SetupPanel } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadDashboardSetupSummary,
  loadOrgContext,
} from "@/services/dashboard";

export default async function DashboardSetupPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const setupSummary = await loadDashboardSetupSummary(org.organizationId);

  return <SetupPanel setupSummary={setupSummary} />;
}
