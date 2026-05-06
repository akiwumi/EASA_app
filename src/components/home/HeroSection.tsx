import Image from "next/image";
import Link from "next/link";

const proofPoints = [
  "Keep instructors and students on the latest approved procedures, automatically.",
  "Turn every EASA change into a training action with a full approval trail.",
  "Stay audit ready without chasing PDFs, emails, or spreadsheets.",
];

export default function HeroSection() {
  return (
    <section className="relative pb-[20px] pt-[20px]">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h1
          className="text-4xl font-normal text-foreground sm:text-6xl md:text-7xl"
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

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-7 text-muted-foreground">
          The compliance and training platform built for Approved Training
          Organisations. Monitor EASA changes, control your manuals, assign
          reading by lesson, and track every acknowledgement in one system
          your whole school actually uses.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-7 py-3 text-base font-medium shadow transition-colors hover:bg-foreground/90 sm:px-8"
            style={{ color: 'var(--color-background)' }}
          >
            Register now
          </Link>
        </div>
      </div>

      <div
        className="relative mt-5 w-full"
        style={{ height: "75vh", minHeight: "580px" }}
      >
        <Image
          src="/images/hero-cessna.jpg"
          alt="Cessna 172 in flight surrounded by Flight Lyceum dashboard analytics"
          fill
          className="object-cover object-center"
          priority
        />

        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "40%",
            background:
              "linear-gradient(to bottom, transparent 0%, oklch(0.985 0.003 110) 100%)",
          }}
        />

        <div className="absolute inset-x-0 bottom-0 px-8 pb-10">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3">
            {proofPoints.map((point) => (
              <div
                key={point}
                className="rounded-2xl px-6 py-5"
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
      </div>
    </section>
  );
}
