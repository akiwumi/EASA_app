const bullets = [
  "No airline bloat — every feature maps to ATO operations",
  "Instructors and students actually use it, not just admins",
  "Readable mobile acknowledgement flow for students on the go",
  "Training impact visible next to document impact in one view",
  "EASA-specific regulatory structure built in from the start",
];

export default function CompetitiveSection() {
  return (
    <section className="py-[20px]">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            Why EASA_app
          </p>
          <h2
            className="text-4xl font-normal tracking-tight text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Built for flight schools, not adapted from airline manual software.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Most document control tools in aviation were designed for airlines
            and scaled down. EASA_app was built from the ground up for ATOs —
            where the same person is often compliance manager, head of training,
            and doing line instruction.
          </p>
        </div>

        <div className="mt-4 space-y-3 md:mt-0">
          {bullets.map((bullet) => (
            <div key={bullet} className="flex items-start gap-3 text-sm text-foreground">
              <span className="shrink-0 font-medium text-muted-foreground">→</span>
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
