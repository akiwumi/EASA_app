import Link from "next/link";

const claims = [
  {
    label: "40+ EASA regulatory families monitored",
    detail:
      "Part-FCL, Part-ORA, Part-NCO, Part-CAT, Part-MED, and more — watched automatically, every day. No manual RSS triage.",
  },
  {
    label: "Draft updates in minutes, not days",
    detail:
      "AI generates a plain-language replacement for each affected manual section. Your compliance manager edits, approves, or rejects before anything changes.",
  },
  {
    label: "Time machine rollback on every change",
    detail:
      "Previous text, new text, who approved it, and when are preserved. Restore a section to a specific retained date when needed.",
  },
];

export default function CompetitiveSection() {
  return (
    <section
      aria-label="Why Flight Lyceum"
      className="easa-section-dark on-dark py-20 md:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12">
          <p className="easa-eyebrow mb-3">Why Flight Lyceum</p>
          <h2
            className="max-w-3xl text-4xl font-normal tracking-tight md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The AI-driven compliance intelligence platform with human oversight.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7">
            Most compliance tools tell you a regulation changed. Flight Lyceum tells
            you exactly which manual section needs attention, drafts replacement text,
            and routes it through human approval before your next training session.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {claims.map((claim, i) => (
            <div key={claim.label} className="easa-card-dark p-6">
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--easa-color-accent-orange)" }}
                aria-hidden="true"
              >
                0{i + 1}
              </p>
              <h3 className="text-base font-semibold">{claim.label}</h3>
              <p className="mt-2 text-sm leading-6">{claim.detail}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link href="/register" className="easa-btn-hero">
            Start 30-day free trial
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium underline underline-offset-4 text-white/70 hover:text-white"
          >
            See pricing →
          </Link>
        </div>
      </div>
    </section>
  );
}
