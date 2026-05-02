"use client";

import { useMemo, useState } from "react";
import type { SignoffRow, TrainingMember } from "@/services/training";

export default function SignoffsClient({
  signoffs,
  lessons,
  members,
  currentUserId,
  canManage,
  role = "viewer",
}: {
  signoffs: SignoffRow[];
  lessons: { id: string; title: string; lesson_code: string | null }[];
  members: TrainingMember[];
  currentUserId: string | null;
  canManage: boolean;
  role?: string;
}) {
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [studentUserId, setStudentUserId] = useState(members[0]?.userId ?? "");
  const [instructorUserId, setInstructorUserId] = useState(currentUserId ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const memberMap = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const lessonMap = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);

  async function createSignoff() {
    if (!studentUserId) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/training/signoffs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: lessonId || null,
        studentUserId,
        instructorUserId: instructorUserId || null,
        signoffNote: note.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(`Error: ${json.error ?? "Failed to create sign-off"}`);
      setSaving(false);
      return;
    }
    window.location.reload();
  }

  async function completeSignoff(row: SignoffRow) {
    setBusyId(row.id);
    const res = await fetch("/api/training/signoffs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        signoffNote: note.trim() || null,
      }),
    });
    if (res.ok) {
      window.location.reload();
      return;
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="easa-card p-5">
          <h2 className="text-sm font-semibold">Create pending sign-off</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select className="easa-input" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">No lesson linked</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {(lesson.lesson_code ? `${lesson.lesson_code} · ` : "") + lesson.title}
                </option>
              ))}
            </select>
            <select className="easa-input" value={studentUserId} onChange={(e) => setStudentUserId(e.target.value)}>
              <option value="">Select student</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {(member.displayName || member.email || member.userId) + ` · ${member.role}`}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <select className="easa-input" value={instructorUserId} onChange={(e) => setInstructorUserId(e.target.value)}>
              <option value="">Assign later</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {(member.displayName || member.email || member.userId) + ` · ${member.role}`}
                </option>
              ))}
            </select>
            <input className="easa-input" placeholder="Initial note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="easa-btn primary" disabled={saving || !studentUserId} onClick={createSignoff}>
              {saving ? "Creating…" : "Create sign-off"}
            </button>
            {message && <p className="text-sm text-[var(--easa-color-accent-pink)]">{message}</p>}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {signoffs.length === 0 ? (
          <div className="easa-card p-6">
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              {role === "student"
                ? "No sign-offs are attached to your record right now."
                : role === "instructor"
                  ? "No pending sign-offs are assigned to you right now."
                  : "No sign-offs are waiting right now."}
            </p>
          </div>
        ) : (
          signoffs.map((row) => {
            const canComplete =
              row.status === "pending" &&
              (canManage || (currentUserId != null && row.instructor_user_id === currentUserId));
            return (
              <div key={row.id} className="easa-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">
                      {row.lesson_id ? lessonMap.get(row.lesson_id)?.title ?? "Lesson sign-off" : "Lesson sign-off"}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
                      Student: {memberMap.get(row.student_user_id)?.displayName || memberMap.get(row.student_user_id)?.email || row.student_user_id}
                    </p>
                    <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
                      Instructor: {row.instructor_user_id ? memberMap.get(row.instructor_user_id)?.displayName || memberMap.get(row.instructor_user_id)?.email || row.instructor_user_id : "Not assigned"}
                    </p>
                  </div>
                  <span className={`easa-badge ${row.status === "completed" ? "is-green" : "is-orange"}`}>
                    {row.status}
                  </span>
                </div>
                {row.signoff_note && (
                  <p className="mt-3 text-sm text-[var(--easa-color-text-secondary)]">{row.signoff_note}</p>
                )}
                {canComplete && (
                  <div className="mt-4">
                    <button className="easa-btn primary" disabled={busyId === row.id} onClick={() => completeSignoff(row)}>
                      {busyId === row.id ? "Saving…" : "Mark signed off"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
