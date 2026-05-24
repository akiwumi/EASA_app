const claims = [
  {
    label: "40+ EASA regulatory families monitored",
    detail:
      "Part-FCL, Part-ORA, Part-NCO, Part-CAT, Part-MED, and more,watched automatically, every day. No manual RSS triage.",
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
    <section className="py-[20px]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            Why Flight Lyceum
          </p>
          <h2
            className="max-w-3xl text-4xl font-normal tracking-tight text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The AI-driven compliance intelligence platform with human oversight.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Most compliance tools tell you a regulation changed. Flight Lyceum tells
            you exactly which manual section needs attention, drafts replacement text,
            and routes it through human approval before your next training session.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {claims.map((claim, i) => (
            <div
              key={claim.label}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                0{i + 1}
              </p>
              <h3 className="text-lg font-semibold text-foreground">{claim.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{claim.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
