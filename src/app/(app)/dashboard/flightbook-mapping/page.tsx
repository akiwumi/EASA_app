import { redirect } from "next/navigation";
import { FlightbookMappingPanel } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadFlightbookMappingRows,
  loadOrgContext,
} from "@/services/dashboard";

export default async function DashboardFlightbookMappingPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const mappingRows = await loadFlightbookMappingRows(org.organizationId);

  return <FlightbookMappingPanel mappingRows={mappingRows} />;
}
