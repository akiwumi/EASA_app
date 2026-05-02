import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTrainingPageContext, loadPhaseDetail } from "@/services/training";

export default async function TrainingPhaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTrainingPageContext();
  if (!ctx.orgId) redirect("/login");
  const { id } = await params;
  const data = await loadPhaseDetail(ctx.orgId, id);

  if (!data.schemaReady) {
    return (
      <div className="easa-card p-6">
        <p className="text-sm text-[var(--easa-color-accent-pink)]">
          Training tables are not available yet. Apply the Phase 3 Supabase migrations first.
        </p>
      </div>
    );
  }

  if (!data.phase) notFound();

  return (
    <div className="space-y-6">
      <Link href={`/training/programmes/${data.phase.programme_id}`} className="text-sm text-[var(--easa-color-text-muted)] transition hover:text-[var(--easa-color-text-primary)]">
        ← Back to programme
      </Link>

      <div className="easa-card p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">Phase</p>
        <h1 className="mt-2 text-2xl font-semibold">{data.phase.title}</h1>
        <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
          {data.phase.description || "No description yet."}
        </p>
      </div>

      <div className="grid gap-4">
        {data.lessons.length === 0 ? (
          <div className="easa-card p-6">
            <p className="text-sm text-[var(--easa-color-text-muted)]">No lessons in this phase yet.</p>
          </div>
        ) : (
          data.lessons.map((lesson) => (
            <Link key={lesson.id} href={`/training/lessons/${lesson.id}`} className="easa-card p-5 transition hover:shadow-[var(--easa-shadow-2)]">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
                {lesson.lesson_code || lesson.lesson_type}
              </p>
              <h2 className="mt-2 text-lg font-semibold">{lesson.title}</h2>
              <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
                {lesson.description || "No description yet."}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
