import { redirect } from "next/navigation";
import { AdminSettingsPanel } from "@/components/dashboard/DashboardSectionPanels";
import { loadOrgContext } from "@/services/dashboard";

export default async function DashboardAdminSettingsPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  return <AdminSettingsPanel />;
}
