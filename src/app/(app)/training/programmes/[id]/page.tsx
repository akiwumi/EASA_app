import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ProgrammeDetailClient from "@/components/training/ProgrammeDetailClient";
import { getTrainingPageContext, loadProgrammeDetail } from "@/services/training";

export default async function TrainingProgrammeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTrainingPageContext();
  if (!ctx.orgId) redirect("/login");
  const { id } = await params;
  const data = await loadProgrammeDetail(ctx.orgId, id);

  if (!data.schemaReady) {
    return (
      <div className="easa-card p-6">
        <p className="text-sm text-[var(--easa-color-accent-pink)]">
          Training tables are not available yet. Apply the Phase 3 Supabase migrations first.
        </p>
      </div>
    );
  }

  if (!data.programme) notFound();

  return (
    <div className="space-y-4">
      <Link href="/training/programmes" className="text-sm text-[var(--easa-color-text-muted)] transition hover:text-[var(--easa-color-text-primary)]">
        ← Back to programmes
      </Link>
      <ProgrammeDetailClient
        programme={data.programme}
        phases={data.phases}
        lessons={data.lessons}
        canManage={ctx.role !== "viewer" && ctx.role !== "student"}
      />
    </div>
  );
}
