import { redirect } from "next/navigation";
import { getOrgAccessContext } from "@/lib/supabase/access";
import NewAdvisoryForm from "@/components/updates/NewAdvisoryForm";

export default async function NewAdvisoryPage() {
  const ctx = await getOrgAccessContext();
  if (!ctx || ctx.role !== "admin") redirect("/updates/advisories");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add advisory</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Manually record an Airworthiness Directive or Safety Information Bulletin.
        </p>
      </div>
      <NewAdvisoryForm orgId={ctx.orgId} />
    </div>
  );
}
