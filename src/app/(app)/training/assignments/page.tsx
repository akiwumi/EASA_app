import { redirect } from "next/navigation";
import AssignmentsClient from "@/components/training/AssignmentsClient";
import { getTrainingPageContext, loadAssignments } from "@/services/training";

export default async function TrainingAssignmentsPage() {
  const ctx = await getTrainingPageContext();
  if (!ctx.orgId) redirect("/login");

  const data = await loadAssignments(ctx.orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Training assignments</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          {ctx.role === "student"
            ? "See the reading that has been assigned to you and what still needs attention."
            : ctx.role === "instructor"
              ? "Track your own assigned reading and manage lesson-linked distribution for others."
              : "Assign reading to students and instructors from lesson-linked material."}
        </p>
      </div>

      {!data.schemaReady ? (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-accent-pink)]">
            Training tables are not available yet. Apply the Phase 3 Supabase migrations first.
          </p>
        </div>
      ) : (
        <AssignmentsClient
          assignments={data.assignments}
          lessons={data.lessons}
          members={data.members}
          canManage={ctx.role !== "viewer" && ctx.role !== "student"}
          role={ctx.role ?? "viewer"}
        />
      )}
    </div>
  );
}
