import { redirect } from "next/navigation";
import ProgrammesClient from "@/components/training/ProgrammesClient";
import { getTrainingPageContext, loadProgrammes } from "@/services/training";

export default async function TrainingProgrammesPage() {
  const ctx = await getTrainingPageContext();
  if (!ctx.orgId) redirect("/login");

  const data = await loadProgrammes(ctx.orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Training programmes</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Create programmes, then add phases, lessons, reading assignments, and sign-offs.
        </p>
      </div>

      {!data.schemaReady ? (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-accent-pink)]">
            Training tables are not available yet. Apply the Phase 3 Supabase migrations first.
          </p>
        </div>
      ) : (
        <ProgrammesClient
          programmes={data.programmes}
          canManage={ctx.role !== "viewer" && ctx.role !== "student"}
        />
      )}
    </div>
  );
}
