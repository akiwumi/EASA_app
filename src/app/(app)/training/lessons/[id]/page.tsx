import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import LessonDetailClient from "@/components/training/LessonDetailClient";
import { getTrainingPageContext, loadLessonDetail } from "@/services/training";

export default async function TrainingLessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTrainingPageContext();
  if (!ctx.orgId) redirect("/login");
  const { id } = await params;
  const data = await loadLessonDetail(ctx.orgId, id);

  if (!data.schemaReady) {
    return (
      <div className="easa-card p-6">
        <p className="text-sm text-[var(--easa-color-accent-pink)]">
          Training tables are not available yet. Apply the Phase 3 Supabase migrations first.
        </p>
      </div>
    );
  }

  if (!data.lesson) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/training/programmes/${data.lesson.programme_id}`} className="text-sm text-[var(--easa-color-text-muted)] transition hover:text-[var(--easa-color-text-primary)]">
        ← Back to programme
      </Link>
      <LessonDetailClient
        lesson={data.lesson}
        documents={data.documents}
        flightbooks={data.flightbooks}
        sections={data.sections}
        canManage={ctx.role !== "viewer" && ctx.role !== "student"}
      />
    </div>
  );
}
