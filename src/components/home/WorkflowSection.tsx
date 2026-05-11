const steps = [
  {
    num: "Step 01",
    title: "Monitor EASA changes",
    body: "Regulatory updates from EASA are automatically detected, summarised by AI, and surfaced in your compliance queue.",
  },
  {
    num: "Step 02",
    title: "Review and approve",
    body: "Your team reviews the AI's recommended changes side-by-side with your existing manual text. Approve, edit, or reject.",
  },
  {
    num: "Step 03",
    title: "Assign reading",
    body: "Distribute approved updates to the right instructors and students based on programme, lesson stage, or aircraft type.",
  },
  {
    num: "Step 04",
    title: "Track acknowledgements",
    body: "See exactly who has read, acknowledged, and completed required action — before the next lesson or audit.",
  },
];

export default function WorkflowSection() {
  return (
    <section
      id="how-it-works"
      className="py-[20px]"
      style={{
        backgroundColor: "oklab(0.94 -0.00964181 0.0114907 / 0.4)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            How it works
          </p>
          <h2
            className="text-4xl font-normal tracking-tight text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From EASA change to instructor sign-off in one workflow.
          </h2>
        </div>

        <div className="easa-mobile-carousel mt-12 grid gap-6 md:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="h-full rounded-2xl border border-border bg-card p-6"
            >
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
          ))}
        </div>
      </div>
    </section>
  );
}
