import { personaCards } from "@/components/landing/site-content";

export default function LandingPersonas() {
  return (
    <section id="who-it-s-for" className="py-8 md:py-14">
      <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <span className="easa-eyebrow">Who it&apos;s for</span>
          <h2 className="easa-display mt-4 text-4xl leading-tight md:text-6xl">
            One platform for compliance teams, instructors, and students.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-[var(--easa-color-text-muted)]">
            The same approved source of truth serves different roles without forcing
            everyone into the same workflow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {personaCards.map((persona, index) => (
            <article key={persona.title} className="easa-panel p-5">
              <p className="easa-display text-4xl leading-none text-[color-mix(in_srgb,var(--easa-color-text-muted)_36%,transparent)]">
                0{index + 1}
              </p>
              <h3 className="mt-4 text-lg font-semibold text-[var(--easa-color-text-primary)]">
                {persona.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-muted)]">
                {persona.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
