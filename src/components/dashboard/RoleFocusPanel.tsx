import Link from "next/link";
import { CheckSquare, ClipboardList, GraduationCap, ShieldCheck } from "lucide-react";
import type { DashboardRoleFocus, OrgContext } from "@/services/dashboard";

function isComplianceRole(role: string) {
  return role === "admin" || role === "editor" || role === "compliance_manager";
}

export default function RoleFocusPanel({
  org,
  focus,
}: {
  org: OrgContext;
  focus: DashboardRoleFocus;
}) {
  if (org.role === "student") {
    return (
      <section className="easa-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_14%,transparent)] text-[var(--easa-color-accent-blue)]">
            <GraduationCap size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Student focus</h2>
            <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
              See your assigned reading first, then confirm what you have read.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">Open reading</p>
            <p className="mt-2 text-2xl font-semibold">{focus.myAssignmentsOpen}</p>
            <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">Assignments still open for you.</p>
          </div>
          <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">Pending acknowledgements</p>
            <p className="mt-2 text-2xl font-semibold">{focus.myPendingAcknowledgements}</p>
            <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">Items still waiting for your confirmation.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="easa-btn primary text-sm" href="/training/assignments">
            My assignments
          </Link>
          <Link className="easa-btn secondary text-sm" href="/training/acknowledgements">
            Confirm reading
          </Link>
        </div>
      </section>
    );
  }

  if (org.role === "instructor") {
    return (
      <section className="easa-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_14%,transparent)] text-[var(--easa-color-accent-orange)]">
            <ClipboardList size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Instructor workload</h2>
            <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
              Keep an eye on assigned reading and the lessons still waiting for sign-off.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">My sign-offs</p>
            <p className="mt-2 text-2xl font-semibold">{focus.myPendingInstructorSignoffs}</p>
            <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">Pending training completions still assigned to you.</p>
          </div>
          <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">Open reading</p>
            <p className="mt-2 text-2xl font-semibold">{focus.myAssignmentsOpen}</p>
            <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">Assigned reading still open on your side.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="easa-btn primary text-sm" href="/training/signoffs">
            Review sign-offs
          </Link>
          <Link className="easa-btn secondary text-sm" href="/training/assignments">
            Review assignments
          </Link>
        </div>
      </section>
    );
  }

  if (isComplianceRole(org.role)) {
    return (
      <section className="easa-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_14%,transparent)] text-[var(--easa-color-accent-pink)]">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Compliance manager action queue</h2>
            <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
              Prioritise approvals, critical notifications, and the training items that are still waiting on people.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">Pending approvals</p>
            <p className="mt-2 text-2xl font-semibold">{focus.orgPendingApprovals}</p>
          </div>
          <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">Reading still open</p>
            <p className="mt-2 text-2xl font-semibold">{focus.myPendingAcknowledgements}</p>
            <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">Your own acknowledgements, if any.</p>
          </div>
          <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">My workload</p>
            <p className="mt-2 text-2xl font-semibold">{focus.myAssignmentsOpen}</p>
            <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">Open assignments linked to your account.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="easa-btn primary text-sm" href="/updates">
            Review approvals
          </Link>
          <Link className="easa-btn secondary text-sm" href="/notifications">
            Open notifications
          </Link>
          <Link className="easa-btn secondary text-sm" href="/training/acknowledgements">
            Review acknowledgements
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="easa-card p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_14%,transparent)] text-[var(--easa-color-accent-blue)]">
          <CheckSquare size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Role focus</h2>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            Your organisation role is read-only right now, so the dashboard keeps the main action lists visible without editing controls.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="easa-btn secondary text-sm" href="/notifications">
          Notifications
        </Link>
        <Link className="easa-btn secondary text-sm" href="/results">
          Results
        </Link>
      </div>
    </section>
  );
}
