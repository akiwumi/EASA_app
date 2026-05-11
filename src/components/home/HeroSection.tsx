import Image from "next/image";
import Link from "next/link";

const proofPoints = [
  "Keep instructors and students on the latest approved procedures, automatically.",
  "Turn every EASA change into a training action with a full approval trail.",
  "Stay audit ready without chasing PDFs, emails, or spreadsheets.",
];

export default function HeroSection() {
  return (
    <section className="relative pb-[10px]">
      <div className="relative overflow-hidden">
        <Image
          src="/images/hero-cessna.jpg"
          alt="Cessna 172 in flight surrounded by Flight Lyceum dashboard analytics"
          width={1600}
          height={1000}
          sizes="100vw"
          className="block h-auto w-full bg-[var(--easa-color-surface-2)] object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,24,23,0.16)_0%,rgba(13,24,23,0.03)_48%,rgba(255,253,248,0.42)_100%)]" />
        <div className="absolute inset-0 z-10 flex translate-y-[30%] items-center justify-center px-6 text-center">
          <h1
            className="easa-h1-mobile-hero max-w-5xl text-4xl font-bold text-white sm:text-6xl md:text-7xl"
            style={{
              fontFamily: "var(--font-display)",
              lineHeight: 1.05,
              letterSpacing: "0",
              textShadow: "0 4px 18px rgba(0, 0, 0, 0.72), 0 1px 3px rgba(0, 0, 0, 0.9)",
            }}
          >
            <span className="block md:inline">Keep your flight</span>{" "}
            <span className="block md:inline">school aligned</span>{" "}
            <span className="block md:inline">and audit ready.</span>
          </h1>
        </div>
      </div>

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
