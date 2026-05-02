import { redirect } from "next/navigation";
import NotificationsList from "@/components/notifications/NotificationsList";
import { getTrainingPageContext } from "@/services/training";

export default async function NotificationsPage() {
  const ctx = await getTrainingPageContext();
  if (!ctx.orgId) redirect("/login");
  return <NotificationsList role={(ctx.role as "admin" | "editor" | "viewer" | "instructor" | "student" | "compliance_manager" | null) ?? "viewer"} />;
}
