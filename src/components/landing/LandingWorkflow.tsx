import { workflowSteps } from "@/components/landing/site-content";

export default function LandingWorkflow() {
  return (
    <section id="how-it-works" className="py-8 md:py-14">
      <div className="mb-10 text-center">
        <span className="easa-eyebrow justify-center">How it works</span>
        <h2 className="easa-display mt-4 text-4xl md:text-6xl">
          From EASA change to instructor sign-off in one workflow.
        </h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {workflowSteps.map((step) => (
          <article key={step.step} className="easa-panel p-6">
            <p className="text-sm font-medium text-[var(--easa-color-text-muted)]">
              Step {step.step}
            </p>
            <h3 className="mt-4 text-xl font-semibold text-[var(--easa-color-text-primary)]">
              {step.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--easa-color-text-muted)]">
              {step.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
