import Link from "next/link";

export default function CtaSection() {
  return (
    <section id="pricing" className="py-[20px]">
      <div className="mx-auto max-w-5xl px-6">
        <div
          className="rounded-3xl p-12 text-center md:p-16"
          style={{ backgroundColor: "oklch(0.32 0.04 150)" }}
        >
          <h2
            className="text-4xl font-normal tracking-tight md:text-5xl"
            style={{ fontFamily: "var(--font-display)", color: "oklch(0.985 0.005 110)" }}
          >
            Keep your school aligned, informed,
            <br />
            and audit-ready.
          </h2>
          <p
            className="mx-auto mt-5 max-w-2xl text-lg leading-7"
            style={{ color: "oklab(0.985 -0.0017101 0.00469846 / 0.7)" }}
          >
            See how EASA_app helps your team manage manuals, training reading, and
            compliance in one workflow. Book a 30-minute demo with the team.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium shadow transition-colors"
              style={{ backgroundColor: "oklch(0.985 0.003 110)", color: "oklch(0.22 0.02 150)" }}
            >
              Book a demo
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center text-sm font-medium transition-colors"
              style={{ color: "oklch(0.985 0.005 110)" }}
            >
              Review pricing →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
