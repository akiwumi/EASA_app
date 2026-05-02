import { redirect } from "next/navigation";
import SignoffsClient from "@/components/training/SignoffsClient";
import { getTrainingPageContext, loadSignoffs } from "@/services/training";

export default async function TrainingSignoffsPage() {
  const ctx = await getTrainingPageContext();
  if (!ctx.orgId) redirect("/login");

  const data = await loadSignoffs(ctx.orgId, ctx.userId, ctx.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Training sign-offs</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          {ctx.role === "student"
            ? "See the lesson sign-offs linked to your training record."
            : ctx.role === "instructor"
              ? "Complete lesson sign-offs once required reading and training items are done."
              : "Record lesson completion once the required reading and training item have been completed."}
        </p>
      </div>

      {!data.schemaReady ? (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-accent-pink)]">
            Training tables are not available yet. Apply the Phase 3 Supabase migrations first.
          </p>
        </div>
      ) : (
        <SignoffsClient
          signoffs={data.signoffs}
          lessons={data.lessons}
          members={data.members}
          currentUserId={ctx.userId}
          canManage={ctx.role !== "viewer" && ctx.role !== "student"}
          role={ctx.role ?? "viewer"}
        />
      )}
    </div>
  );
}
