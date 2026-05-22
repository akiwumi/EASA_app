import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/landing/MarketingShell";
import { isUserSignedIn } from "@/lib/supabase/server";
import {
  BookOpen,
  CheckCircle,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  RadioTower,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works — Flight Lyceum",
  description:
    "See how Flight Lyceum connects EASA regulation monitoring, manual control, reading assignments, and acknowledgement tracking in one controlled workflow for Approved Training Organisations.",
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "How It Works — Flight Lyceum",
    description:
      "From regulation change to lesson action in one controlled workflow. See how Flight Lyceum ties together update monitoring, manual control, and completion evidence.",
    url: "/how-it-works",
  },
};

const setupSteps = [
  {
    step: "01",
    icon: LayoutDashboard,
    title: "Register your school",
    description:
      "Create your organisation account, set your school name, and invite your team. Admins, instructors, and students each get role-appropriate access from day one.",
  },
  {
    step: "02",
    icon: BookOpen,
    title: "Upload your manuals",
    description:
      "Upload your Operations Manual, Training Manual, MEL, or any other document as PDF, Markdown, or plain text. Flight Lyceum parses each file into indexed sections so the AI knows exactly what your school has approved.",
  },
  {
    step: "03",
    icon: GraduationCap,
    title: "Build your training programmes",
    description:
      "Create training programmes, add phases, and organise lessons. Attach aircraft types, assign instructors, and link your manuals to specific lessons so students always read the right material at the right time.",
  },
  {
    step: "04",
    icon: Users,
    title: "Invite your people",
    description:
      "Add instructors and enrol students. Each person sees only what their role allows — students get their reading list, instructors manage assignments and sign-offs, admins control the full school.",
  },
];

const operationalSteps = [
  {
    step: "05",
    icon: RadioTower,
    title: "Monitor EASA changes automatically",
    description:
      "Flight Lyceum watches official EASA publications daily. When a change lands — Part-FCL, Part-ORA, new AMC/GM — it is flagged automatically and added to your review queue.",
  },
  {
    step: "06",
    icon: FileText,
    title: "Review the AI impact assessment",
    description:
      "For each detected change, the AI compares the new regulation against your uploaded manuals, highlights the affected sections, and drafts a plain-language summary of what needs updating. You decide whether to approve, reject, or note it.",
  },
  {
    step: "07",
    icon: ListChecks,
    title: "Approve updates and publish",
    description:
      "Approved changes generate a new version of your manual automatically, stamped with date, version number, and the reviewer's name. The previous version stays in history for audit purposes. Nothing is ever lost.",
  },
  {
    step: "08",
    icon: CheckCircle,
    title: "Assign reading and collect acknowledgements",
    description:
      "Assign the updated sections to the relevant instructors or students. They receive a notification, read the material on any device, and mark it as acknowledged. You see exactly who has read, who hasn't, and when — ready for your next audit.",
  },
];

const roles = [
  {
    title: "Head of Training / Compliance Manager",
    description:
      "You get the big picture. Pending EASA changes, manuals due for review, unacknowledged updates across instructors and students — everything in one dashboard. You set the workflow and approve what goes out.",
  },
  {
    title: "Chief Flying Instructor",
    description:
      "You oversee training delivery. Assign reading by lesson, track which students are ready for their next phase, and sign off on completed training activities directly in the platform.",
  },
  {
    title: "Instructors",
    description:
      "You see what is assigned to you and your students. Access current procedures before a lesson, check who has read the pre-lesson material, and log training sign-offs without paperwork.",
  },
  {
    title: "Students",
    description:
      "You get a clean reading list on your phone. Your assigned sections, due dates, and acknowledgement buttons are right there. No digging through PDFs — just what you need before your next lesson.",
  },
];

export default async function HowItWorksPage() {
  const signedIn = await isUserSignedIn();

  return (
    <MarketingShell signedIn={signedIn}>
      <div className="space-y-6">

        {/* ── Hero ── */}
        <section className="easa-panel overflow-hidden">
          <div className="easa-gradient-bar" />
          <div className="px-6 py-10 lg:px-10 lg:py-14">
            <span className="easa-eyebrow">How it works</span>
            <h1 className="easa-display easa-h1-mobile-hero mt-4 max-w-4xl text-5xl leading-tight md:text-6xl">
              From regulation change to lesson action in one controlled workflow.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--easa-color-text-muted)]">
              Flight Lyceum is a compliance and training platform built for EASA Approved Training Organisations.
              It connects four things that most schools manage in four separate places: regulation monitoring,
              manual control, training delivery, and acknowledgement tracking. When they work together, you
              stop chasing paper and start running a school you can actually audit.
            </p>
          </div>
        </section>

        {/* ── What is it ── */}
        <section className="easa-panel p-6 lg:p-10">
          <span className="easa-eyebrow">What is Flight Lyceum?</span>
          <h2 className="easa-display mt-4 text-3xl leading-tight md:text-4xl">
            One platform for every part of ATO compliance and training.
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: RadioTower,
                title: "Regulation monitoring",
                body: "Automatic detection of EASA changes across Part-FCL, Part-ORA, and AMC/GM. No manual scanning.",
              },
              {
                icon: BookOpen,
                title: "Manual control",
                body: "Versioned flight books with full revision history. Every change is approved, logged, and auditable.",
              },
              {
                icon: GraduationCap,
                title: "Training delivery",
                body: "Programmes, phases, lessons, and reading assignments tied to the right people and aircraft types.",
              },
              {
                icon: CheckCircle,
                title: "Acknowledgement tracking",
                body: "See who has read and acknowledged every update — by name, date, and lesson — before your next audit.",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="rounded-2xl bg-[var(--easa-color-surface-2)] p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--easa-color-brand-light)]">
                    <Icon size={17} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[var(--easa-color-text-primary)]">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--easa-color-text-muted)]">{card.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Setup sequence ── */}
        <section className="easa-panel p-6 lg:p-10">
          <span className="easa-eyebrow">Getting started</span>
          <h2 className="easa-display mt-4 text-3xl leading-tight md:text-4xl">
            Set up your school in four steps.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--easa-color-text-muted)]">
            Most schools are up and running within a day. Start with your manuals and build out from there.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {setupSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--easa-color-brand-primary)] text-white">
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="mt-2 w-px flex-1 bg-[var(--easa-color-border)]" />
                  </div>
                  <div className="pb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--easa-color-text-muted)]">
                      Step {step.step}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-[var(--easa-color-text-primary)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-muted)]">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Operational sequence ── */}
        <section className="easa-panel p-6 lg:p-10">
          <span className="easa-eyebrow">Day-to-day workflow</span>
          <h2 className="easa-display mt-4 text-3xl leading-tight md:text-4xl">
            Then the platform runs the compliance loop for you.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--easa-color-text-muted)]">
            Once your school is set up, Flight Lyceum monitors changes, surfaces impact, and routes
            approvals — so your team acts on the right things rather than discovering them too late.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {operationalSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--easa-color-brand-primary)_14%,transparent)] text-[var(--easa-color-brand-primary)]">
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="mt-2 w-px flex-1 bg-[var(--easa-color-border)]" />
                  </div>
                  <div className="pb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--easa-color-text-muted)]">
                      Step {step.step}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-[var(--easa-color-text-primary)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-muted)]">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Who uses it ── */}
        <section className="easa-panel p-6 lg:p-10">
          <span className="easa-eyebrow">Who uses it</span>
          <h2 className="easa-display mt-4 text-3xl leading-tight md:text-4xl">
            Every role in your school has a view built for them.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {roles.map((role) => (
              <div
                key={role.title}
                className="rounded-2xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-5"
              >
                <p className="text-sm font-semibold text-[var(--easa-color-text-primary)]">{role.title}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-muted)]">{role.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why it works callout ── */}
        <article className="rounded-[36px] bg-[var(--easa-color-brand-primary)] p-8 text-[#f7f2e8] shadow-[var(--easa-shadow-brand)] lg:p-10">
          <span className="easa-eyebrow text-white/62">Why it works</span>
          <h2 className="easa-display mt-4 text-4xl leading-tight md:text-5xl">
            Compliance review stays deliberate while distribution becomes effortless.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/72">
            The platform keeps two lanes separate: a slow, careful lane for compliance approvals with full
            history and rollback — and a fast lane for getting approved material to the right people. Your
            compliance team is never bypassed and your instructors are never waiting.
          </p>
        </article>

        {/* ── CTA ── */}
        <section className="easa-panel p-8 md:p-10">
          <h2 className="easa-display text-4xl leading-tight md:text-5xl">
            Want to see the workflow applied to your current manuals?
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--easa-color-text-muted)]">
            We can walk through how your school handles revisions today and show exactly what changes once
            updates, reading assignments, and acknowledgements are in one system.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="easa-btn primary" href="/register">
              Register your school
            </Link>
            <Link className="easa-btn secondary" href="/contact">
              Book a demo
            </Link>
          </div>
        </section>

      </div>
    </MarketingShell>
  );
}
