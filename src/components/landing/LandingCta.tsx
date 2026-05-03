import Link from "next/link";

export default function LandingCta() {
  return (
    <section className="py-8 md:py-14">
      <div className="overflow-hidden rounded-[40px] bg-[var(--easa-color-brand-primary)] text-[#f6f2ea] shadow-[var(--easa-shadow-brand)]">
        <div className="easa-gradient-bar opacity-70" />
        <div className="px-6 py-12 text-center md:px-12 md:py-16">
          <span className="easa-eyebrow justify-center text-white/62">Closing CTA</span>
          <h2 className="easa-display mt-4 text-4xl leading-tight md:text-6xl">
            Keep your school aligned, informed, and audit-ready.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/70 md:text-lg">
            See how EASA_app helps your team manage manuals, training reading, and
            compliance in one workflow.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link className="easa-btn bg-[#f7f2e8] text-[var(--easa-color-brand-primary)]" href="/book-demo">
              Book a demo
            </Link>
            <Link className="easa-btn border border-white/18 bg-white/8 text-white" href="/pricing">
              Review pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
