const personas = [
  {
    num: "01",
    title: "Head of Training",
    body: "See pending reads, critical regulation changes, and training impact across the entire school from one dashboard.",
  },
  {
    num: "02",
    title: "Compliance Managers",
    body: "Track approvals, regulation mappings, version history, and audit trails — without spreadsheet workarounds.",
  },
  {
    num: "03",
    title: "Instructors",
    body: "Fast access to current procedures, lesson-linked documents, and pending sign-offs from wherever you are.",
  },
  {
    num: "04",
    title: "Students",
    body: "Read assigned material on mobile, understand what changed, and acknowledge updates in seconds.",
  },
];

export default function PersonasSection() {
  return (
    <section id="who-it-s-for" className="py-[20px]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              Who it&apos;s for
            </p>
            <h2
              className="text-4xl font-normal leading-tight tracking-tight text-foreground md:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              One platform for compliance teams,
              <br />
              instructors, and students.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The same approved source of truth serves different roles without
              forcing everyone into the same workflow.
            </p>
          </div>

          <div className="easa-mobile-carousel grid md:grid-cols-2 gap-4">
            {personas.map((persona) => (
              <div
                key={persona.num}
                className="h-full rounded-2xl border border-border bg-card p-5"
              >
                <p
                  className="mb-3 text-3xl leading-none text-muted-foreground/40"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {persona.num}
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  {persona.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {persona.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
