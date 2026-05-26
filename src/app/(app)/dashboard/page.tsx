import { redirect } from "next/navigation";
import FLDesignDashboard from "@/components/dashboard/FLDesignDashboard";
import {
  loadDashboardStats,
  loadOrgContext,
  loadDashboardSetupSummary,
  loadUpdateQueuePreview,
  loadLatestAuditSnapshot,
} from "@/services/dashboard";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const supabase = await getSupabaseServerClient();
  const userData = supabase ? (await supabase.auth.getUser()).data.user : null;

  const [setupSummary, stats, queuePreview, latestAuditSnapshot] = await Promise.all([
    loadDashboardSetupSummary(org.organizationId),
    loadDashboardStats(org.organizationId),
    loadUpdateQueuePreview(org.organizationId, 25),
    loadLatestAuditSnapshot(org.organizationId),
  ]);

  // Derive user display info from auth metadata or email
  const fullName =
    (userData?.user_metadata?.full_name as string | undefined) ??
    (userData?.user_metadata?.name as string | undefined) ??
    userData?.email?.split("@")[0]?.replace(/[._-]/g, " ") ??
    "Manager";

  const displayName = fullName
    .split(" ")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join("");

  const roleLabel =
    org.role === "admin" ? "Admin" :
    org.role === "compliance_manager" ? "Compliance Manager" :
    org.role === "instructor" ? "Instructor" :
    "Team Member";

  const now = new Date();
  const dateDay = now.getDate();
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const dateLabel = `${days[now.getDay()]},\n${months[now.getMonth()]}`;

  return (
    /* Escape AppShell's padding, then keep the dashboard 50px from the desktop sidebar. */
    <div className="-mx-4 -mt-4 -mb-8 lg:-mr-8 lg:-mt-10 lg:-mb-8 lg:-ml-4">
    <FLDesignDashboard
      userName={displayName}
      userInitials={initials}
      userRole={roleLabel}
      pendingReviews={stats.pendingApprovals}
      newChanges7d={stats.newChanges7d}
      approvedThisWeek={stats.approvedThisWeek}
      pendingApprovals={stats.pendingApprovals}
      flightbookCount={setupSummary.flightbookCount}
      sourcesTotal={stats.sourcesTotal}
      sourcesActive={stats.sourcesActive}
      dateDay={dateDay}
      dateLabel={dateLabel}
      queuePreview={queuePreview}
      latestAuditSnapshot={latestAuditSnapshot}
    />
    </div>
  );
}
