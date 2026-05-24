const claims = [
  {
    label: "40+ EASA regulatory families monitored",
    detail:
      "Part-FCL, Part-ORA, Part-NCO, Part-CAT, Part-MED, and more — watched automatically, every day. No manual RSS triage.",
  },
  {
    label: "Draft updates in minutes, not days",
    detail:
      "AI generates a plain-language replacement for each affected manual section. Your compliance manager approves or edits. Students get the update before the next lesson.",
  },
  {
    label: "Full rollback on every change",
    detail:
      "Previous text, new text, who approved it, and when — all preserved. Your audit trail is ready before the inspector arrives.",
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
            The only ATO platform that monitors EASA and writes the update for you.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Most compliance tools tell you a regulation changed. Flight Lyceum tells
            you exactly which section of your manual to update, drafts the replacement
            text, and routes it through approval — before your next training session.
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
