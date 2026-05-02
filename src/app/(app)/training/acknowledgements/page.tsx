import { redirect } from "next/navigation";
import AcknowledgementsClient from "@/components/training/AcknowledgementsClient";
import { getTrainingPageContext, loadAcknowledgements } from "@/services/training";

export default async function TrainingAcknowledgementsPage() {
  const ctx = await getTrainingPageContext();
  if (!ctx.orgId) redirect("/login");

  const data = await loadAcknowledgements(ctx.orgId, ctx.userId, ctx.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Acknowledgements</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          {ctx.role === "student"
            ? "Confirm the reading you have completed and leave a note if anything needs clarification."
            : ctx.role === "instructor"
              ? "See which assigned readings are still waiting for student confirmation."
              : "Students can confirm required reading here, while staff can review completion."}
        </p>
      </div>

      {!data.schemaReady ? (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-accent-pink)]">
            Training tables are not available yet. Apply the Phase 3 Supabase migrations first.
          </p>
        </div>
      ) : (
        <AcknowledgementsClient
          acknowledgements={data.acknowledgements}
          currentUserId={ctx.userId}
          role={ctx.role ?? "viewer"}
        />
      )}
    </div>
  );
}
