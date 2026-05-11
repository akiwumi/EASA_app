import { redirect } from "next/navigation";
import { ComplianceHighlightsPanel } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadOrgContext,
  loadRiskMix,
} from "@/services/dashboard";

export default async function DashboardCompliancePage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const riskMix = await loadRiskMix(org.organizationId);

  return <ComplianceHighlightsPanel riskMix={riskMix} />;
}
