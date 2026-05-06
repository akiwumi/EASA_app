import UpdatesQueue from "@/components/updates/UpdatesQueue";
import { getOrgAccessContext, ORG_APPROVER_ROLES } from "@/lib/supabase/access";

export default async function UpdatesQueuePage() {
  const ctx = await getOrgAccessContext();
  const canManage = ctx ? ORG_APPROVER_ROLES.includes(ctx.role as (typeof ORG_APPROVER_ROLES)[number]) : false;

  return <UpdatesQueue canManage={canManage} />;
}
