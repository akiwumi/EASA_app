const bullets = [
  "No airline bloat. Every feature maps to ATO operations.",
  "Instructors and students actually use it, not just admins.",
  "Readable mobile acknowledgement flows for students on the go.",
  "Training impact sits next to document impact in one view.",
  "EASA-specific regulatory structure is built in from the start.",
];

export default function LandingCompetitive() {
  return (
    <section className="py-8 md:py-14">
      <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <span className="easa-eyebrow">Why Flight Lyceum</span>
          <h2 className="easa-display mt-4 text-4xl leading-tight md:text-6xl">
            Built for flight schools, not adapted from airline manual software.
          </h2>
          <p className="mt-5 text-base leading-8 text-[var(--easa-color-text-muted)]">
            Most document control tools in aviation were designed for airlines and
            scaled down. Flight Lyceum was built from the ground up for ATOs, where the
            same person is often compliance manager, head of training, and line
            instructor at the same time.
          </p>
        </div>

        <div className="space-y-3">
          {bullets.map((bullet) => (
            <div key={bullet} className="easa-panel flex items-start gap-3 p-5">
              <span className="text-lg text-[var(--easa-color-text-muted)]">→</span>
              <p className="text-sm leading-7 text-[var(--easa-color-text-primary)]">{bullet}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
