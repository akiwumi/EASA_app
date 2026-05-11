import { redirect } from "next/navigation";
import { LessonsAffectedPanel } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadAffectedLessonsPreview,
  loadOrgContext,
} from "@/services/dashboard";

export default async function DashboardLessonsAffectedPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const affectedLessons = await loadAffectedLessonsPreview(org.organizationId, 20);

  return <LessonsAffectedPanel affectedLessons={affectedLessons} />;
}
