import Image from "next/image";
import Link from "next/link";

const proofPoints = [
  "Keep instructors and students on the latest approved procedures, automatically.",
  "Turn every EASA change into a training action with a full approval trail.",
  "Stay audit ready without chasing PDFs, emails, or spreadsheets.",
];

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden rounded-[40px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] shadow-[var(--easa-shadow-2)]">
      <div className="easa-gradient-bar" />
      <div className="px-6 pb-0 pt-14 text-center md:px-10 md:pt-18">
        <span className="easa-eyebrow justify-center">
          Training operations and compliance
        </span>
        <h1 className="easa-display easa-h1-mobile-hero mx-auto mt-5 max-w-5xl text-5xl leading-[0.98] md:text-7xl">
          Keep your flight school aligned and audit-ready.
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[var(--easa-color-text-muted)] md:text-lg">
          The compliance and training platform built for Approved Training Organisations.
          Monitor EASA changes, control your manuals, assign reading by lesson, and track
          every acknowledgement in one system your whole school actually uses.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 pb-10">
          <Link className="easa-btn primary" href="/register">
            Register
          </Link>
          <Link className="easa-btn secondary" href="/how-it-works">
            See how it works
          </Link>
        </div>
      </div>

      <div className="relative mt-2 min-h-[520px]">
        <Image
          src="/images/hero-cessna.jpg"
          alt="Aircraft in flight with the EASA app experience layered over it"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,253,248,0)_0%,rgba(244,242,236,0.16)_65%,rgba(244,242,236,0.96)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-6 md:px-8 md:pb-8">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            {proofPoints.map((point) => (
              <div
                key={point}
                className="rounded-[24px] border border-white/60 bg-white/74 px-5 py-5 shadow-[0_14px_40px_rgba(24,36,33,0.1)] backdrop-blur-md"
              >
                <p className="text-sm leading-6 text-[var(--easa-color-text-primary)]">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
