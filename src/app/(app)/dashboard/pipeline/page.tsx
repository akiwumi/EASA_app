import { redirect } from "next/navigation";
import { PipelineStatusPanel } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadOrgContext,
  loadRecentPipelineRun,
} from "@/services/dashboard";

export default async function DashboardPipelinePage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const pipeline = await loadRecentPipelineRun(org.organizationId);

  return <PipelineStatusPanel pipeline={pipeline} />;
}
