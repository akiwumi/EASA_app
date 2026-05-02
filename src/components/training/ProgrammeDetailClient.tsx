"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TrainingLessonRow, TrainingPhaseRow, TrainingProgrammeRow } from "@/services/training";

export default function ProgrammeDetailClient({
  programme,
  phases,
  lessons,
  canManage,
}: {
  programme: TrainingProgrammeRow;
  phases: TrainingPhaseRow[];
  lessons: TrainingLessonRow[];
  canManage: boolean;
}) {
  const [phaseTitle, setPhaseTitle] = useState("");
  const [phaseDescription, setPhaseDescription] = useState("");
  const [phaseSaving, setPhaseSaving] = useState(false);
  const [phaseMessage, setPhaseMessage] = useState<string | null>(null);

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonCode, setLessonCode] = useState("");
  const [lessonType, setLessonType] = useState("ground");
  const [lessonPhaseId, setLessonPhaseId] = useState<string>(phases[0]?.id ?? "");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonMessage, setLessonMessage] = useState<string | null>(null);

  const lessonsByPhase = useMemo(() => {
    const map = new Map<string, TrainingLessonRow[]>();
    for (const lesson of lessons) {
      const key = lesson.phase_id ?? "unassigned";
      const current = map.get(key) ?? [];
      current.push(lesson);
      map.set(key, current);
    }
    return map;
  }, [lessons]);

  async function createPhase() {
    if (!phaseTitle.trim()) return;
    setPhaseSaving(true);
    setPhaseMessage(null);
    const res = await fetch("/api/training/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programmeId: programme.id,
        title: phaseTitle.trim(),
        description: phaseDescription.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setPhaseMessage(`Error: ${json.error ?? "Failed to create phase"}`);
      setPhaseSaving(false);
      return;
    }
    window.location.reload();
  }

  async function createLesson() {
    if (!lessonTitle.trim()) return;
    setLessonSaving(true);
    setLessonMessage(null);
    const res = await fetch("/api/training/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programmeId: programme.id,
        phaseId: lessonPhaseId || null,
        title: lessonTitle.trim(),
        lessonCode: lessonCode.trim() || null,
        lessonType,
        description: lessonDescription.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setLessonMessage(`Error: ${json.error ?? "Failed to create lesson"}`);
      setLessonSaving(false);
      return;
    }
    window.location.assign(`/training/lessons/${json.lesson.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="easa-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
              {programme.code || "Programme"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{programme.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--easa-color-text-muted)]">
              {programme.description || "No description yet."}
            </p>
          </div>
          <span className={`easa-badge ${programme.active ? "is-green" : "is-muted"}`}>
            {programme.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {canManage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="easa-card p-5">
            <h2 className="text-sm font-semibold">Add phase</h2>
            <input
              className="easa-input mt-4 w-full"
              placeholder="Phase title"
              value={phaseTitle}
              onChange={(e) => setPhaseTitle(e.target.value)}
            />
            <textarea
              className="easa-input mt-3 min-h-24 w-full resize-y"
              placeholder="Phase description"
              value={phaseDescription}
              onChange={(e) => setPhaseDescription(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className="easa-btn primary" disabled={phaseSaving || !phaseTitle.trim()} onClick={createPhase}>
                {phaseSaving ? "Creating…" : "Create phase"}
              </button>
              {phaseMessage && <p className="text-sm text-[var(--easa-color-accent-pink)]">{phaseMessage}</p>}
            </div>
          </div>

          <div className="easa-card p-5">
            <h2 className="text-sm font-semibold">Add lesson</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                className="easa-input"
                placeholder="Lesson title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
              <input
                className="easa-input"
                placeholder="Lesson code"
                value={lessonCode}
                onChange={(e) => setLessonCode(e.target.value)}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select className="easa-input" value={lessonPhaseId} onChange={(e) => setLessonPhaseId(e.target.value)}>
                <option value="">No phase yet</option>
                {phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.title}
                  </option>
                ))}
              </select>
              <select className="easa-input" value={lessonType} onChange={(e) => setLessonType(e.target.value)}>
                <option value="ground">Ground</option>
                <option value="flight">Flight</option>
                <option value="simulator">Simulator</option>
                <option value="briefing">Briefing</option>
              </select>
            </div>
            <textarea
              className="easa-input mt-3 min-h-24 w-full resize-y"
              placeholder="Lesson description"
              value={lessonDescription}
              onChange={(e) => setLessonDescription(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className="easa-btn primary" disabled={lessonSaving || !lessonTitle.trim()} onClick={createLesson}>
                {lessonSaving ? "Creating…" : "Create lesson"}
              </button>
              {lessonMessage && <p className="text-sm text-[var(--easa-color-accent-pink)]">{lessonMessage}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {phases.length === 0 ? (
          <div className="easa-card p-6">
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              No phases yet. Create the first phase to start structuring this programme.
            </p>
          </div>
        ) : (
          phases.map((phase) => {
            const phaseLessons = lessonsByPhase.get(phase.id) ?? [];
            return (
              <div key={phase.id} className="easa-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
                      Phase
                    </p>
                    <Link href={`/training/phases/${phase.id}`} className="mt-2 inline-block text-lg font-semibold hover:underline">
                      {phase.title}
                    </Link>
                    <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
                      {phase.description || "No description yet."}
                    </p>
                  </div>
                  <span className="easa-badge is-blue">
                    {phaseLessons.length} lesson{phaseLessons.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {phaseLessons.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {phaseLessons.map((lesson) => (
                      <Link key={lesson.id} href={`/training/lessons/${lesson.id}`} className="rounded-full bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-3)]">
                        {lesson.lesson_code ? `${lesson.lesson_code} · ` : ""}{lesson.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {(lessonsByPhase.get("unassigned") ?? []).length > 0 && (
          <div className="easa-card p-5">
            <h2 className="text-sm font-semibold">Unassigned lessons</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(lessonsByPhase.get("unassigned") ?? []).map((lesson) => (
                <Link key={lesson.id} href={`/training/lessons/${lesson.id}`} className="rounded-full bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-3)]">
                  {lesson.lesson_code ? `${lesson.lesson_code} · ` : ""}{lesson.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
