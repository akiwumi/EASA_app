import Image from "next/image";
import Link from "next/link";

const proofPoints = [
  "Keep instructors and students on the latest approved procedures, automatically.",
  "Turn every EASA change into a training action with a full approval trail.",
  "Stay audit ready without chasing PDFs, emails, or spreadsheets.",
];

export default function HeroSection() {
  return (
    <section className="relative pb-[10px] pt-[20px]">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h1
          className="easa-h1-mobile-hero text-4xl font-normal text-foreground sm:text-6xl md:text-7xl"
          style={{
            fontFamily: "var(--font-display)",
            lineHeight: 1.05,
            letterSpacing: "-1.8px",
          }}
        >
          <span className="block md:inline">Keep your flight</span>{" "}
          <span className="block md:inline">school aligned</span>{" "}
          <span className="block md:inline">and audit ready.</span>
        </h1>
      </div>

      <Image
        src="/images/hero-cessna.jpg"
        alt="Cessna 172 in flight surrounded by Flight Lyceum dashboard analytics"
        width={1600}
        height={1000}
        sizes="100vw"
        className="mt-3 block h-auto w-full object-cover sm:mt-4"
        priority
      />

      <div className="mx-auto max-w-7xl px-6 text-center">
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-muted-foreground">
          The compliance and training platform built for Approved Training
          Organisations. Monitor EASA changes, control your manuals, assign
          reading by lesson, and track every acknowledgement in one system
          your whole school actually uses.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-7 py-3 text-base font-medium shadow transition-colors hover:bg-foreground/90 sm:px-8"
            style={{ color: 'var(--color-background)' }}
          >
            Register now
          </Link>
        </div>

        <div className="easa-mobile-carousel mx-auto mt-5 flex max-w-6xl snap-x gap-4 overflow-x-auto pb-2 md:overflow-visible">
          {proofPoints.map((point) => (
            <div
              key={point}
              className="min-w-[78vw] snap-center rounded-2xl px-6 py-5 sm:min-w-[360px] md:min-w-0 md:flex-1"
              style={{
                backgroundColor: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
              }}
            >
              <p className="text-sm leading-6" style={{ color: "oklch(0.22 0.02 150)" }}>
                {point}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
