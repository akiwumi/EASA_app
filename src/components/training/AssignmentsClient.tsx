"use client";

import { useMemo, useState } from "react";
import type { AssignmentRow, TrainingMember } from "@/services/training";

export default function AssignmentsClient({
  assignments,
  lessons,
  members,
  canManage,
  role = "viewer",
}: {
  assignments: AssignmentRow[];
  lessons: { id: string; title: string; lesson_code: string | null }[];
  members: TrainingMember[];
  canManage: boolean;
  role?: string;
}) {
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [userId, setUserId] = useState(members[0]?.userId ?? "");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const memberMap = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const lessonMap = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);

  async function createAssignment() {
    if (!userId || !title.trim()) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/training/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: lessonId || null,
        userId,
        title: title.trim(),
        dueAt: dueAt || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(`Error: ${json.error ?? "Failed to assign reading"}`);
      setSaving(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="easa-card p-5">
          <h2 className="text-sm font-semibold">Assign reading</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="easa-input" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">No lesson linked</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {(lesson.lesson_code ? `${lesson.lesson_code} · ` : "") + lesson.title}
                </option>
              ))}
            </select>
            <select className="easa-input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select user</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {(member.displayName || member.email || member.userId) + ` · ${member.role}`}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="easa-input" placeholder="Assignment title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="easa-input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="easa-btn primary" disabled={saving || !userId || !title.trim()} onClick={createAssignment}>
              {saving ? "Assigning…" : "Create assignment"}
            </button>
            {message && <p className="text-sm text-[var(--easa-color-accent-pink)]">{message}</p>}
          </div>
        </div>
      )}

      <div className="easa-card overflow-hidden p-0">
        {assignments.length === 0 ? (
          <p className="p-5 text-sm text-[var(--easa-color-text-muted)]">
            {role === "student"
              ? "No reading has been assigned to you yet."
              : role === "instructor"
                ? "No reading assignments are open yet."
                : "No reading assignments have been created yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Assignment</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">User</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Lesson</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Due</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-[var(--easa-color-border)] last:border-0">
                  <td className="px-4 py-3 font-medium">{assignment.title}</td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">
                    {memberMap.get(assignment.user_id)?.displayName || memberMap.get(assignment.user_id)?.email || assignment.user_id}
                  </td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">
                    {assignment.lesson_id ? lessonMap.get(assignment.lesson_id)?.title ?? "Lesson" : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">
                    {assignment.due_at ? new Date(assignment.due_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`easa-badge ${assignment.status === "assigned" ? "is-orange" : "is-green"}`}>
                      {assignment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
