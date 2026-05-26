const steps = [
  {
    num: "Step 01",
    title: "Monitor EASA changes",
    body: "Regulatory updates from EASA are automatically detected, summarised by AI, and surfaced in your compliance queue.",
  },
  {
    num: "Step 02",
    title: "Review and approve",
    body: "AI recommends the change. Your compliance team reviews the evidence, edits the wording, and approves or rejects the update.",
  },
  {
    num: "Step 03",
    title: "Assign reading",
    body: "Distribute approved updates to the right instructors and students based on programme, lesson stage, or aircraft type.",
  },
  {
    num: "Step 04",
    title: "Track acknowledgements",
    body: "See exactly who has read, acknowledged, and completed required action, before the next lesson or audit.",
  },
  {
    num: "Step 05",
    title: "Roll back by date",
    body: "Use Time machine to compare versions and restore a section to a specific earlier state whenever needed.",
  },
];

export default function WorkflowSection() {
  return (
    <section
      id="how-it-works"
      aria-label="How it works"
      className="py-16 md:py-20"
      style={{ backgroundColor: "oklab(0.94 -0.00964181 0.0114907 / 0.4)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <p className="easa-eyebrow mb-3">How it works</p>
          <h2
            className="text-4xl font-normal tracking-tight text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From EASA change to instructor sign-off in one workflow.
          </h2>
        </div>

        <ol className="easa-mobile-carousel grid gap-0 md:grid-cols-5" aria-label="Workflow steps">
          {steps.map((step, i) => (
            <li key={step.num} className="relative flex items-stretch">
              <div className="h-full w-full rounded-2xl border border-border bg-card p-6">
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  {step.num}
                </p>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.body}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center w-6 h-6 rounded-full bg-background border border-border text-muted-foreground text-xs font-bold select-none md:flex"
                >
                  →
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
