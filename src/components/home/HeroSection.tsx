import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Clock, FileCheck } from "lucide-react";

const proofPoints = [
  {
    icon: ShieldCheck,
    heading: "No more bulletin-hunting",
    body: "40+ EASA regulatory families are monitored automatically, every day. Changes surface in your queue — not your inbox.",
  },
  {
    icon: Clock,
    heading: "From change to drafted update in minutes",
    body: "AI flags the affected manual sections and writes the first draft. Your team edits, approves, or rejects. Nothing changes without a human sign-off.",
  },
  {
    icon: FileCheck,
    heading: "Audit-ready by default",
    body: "Every approval, rollback, and acknowledgement is logged with a timestamp. At your next audit, pull the exact procedure version active on any date.",
  },
];

export default function HeroSection() {
  return (
    <section aria-label="Hero" className="relative">
      {/* ── Image constrained to viewport height so CTA is always above fold ── */}
      <div className="relative h-[82vh] min-h-[520px] max-h-[860px] overflow-hidden">
        <Image
          src="/images/hero-cessna.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
        {/* Gradient: light at top (nav contrast), heavy at bottom (text contrast) */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(13,24,23,0.18) 0%, rgba(13,24,23,0.04) 38%, rgba(13,24,23,0.72) 100%)",
          }}
        />

        {/* ── All conversion content inside the image ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-10 text-center sm:pb-14">
          <h1
            className="max-w-4xl font-bold text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 5vw, 4rem)",
              lineHeight: 1.08,
              textShadow: "0 2px 16px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            AI-driven compliance intelligence.
            <br />Human-approved control.
          </h1>

          <p
            className="mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg"
            style={{
              color: "rgba(255,253,248,0.88)",
              textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            }}
          >
            Flight Lyceum monitors 40+ EASA regulatory families, flags affected manual
            sections, and drafts plain-language updates — ready for your compliance
            team to review, edit, and approve.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className="easa-btn-hero">
              Start 30-day free trial
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-semibold text-white/90 underline underline-offset-4 transition hover:text-white"
            >
              See how it works →
            </Link>
          </div>

          {/* Pricing anchor + trust microcopy */}
          <p className="mt-3 text-xs text-white/60">
            From €199/month ·{" "}
            <Link href="/pricing" className="underline underline-offset-2 hover:text-white/80">
              See pricing
            </Link>{" "}
            · No credit card required · Cancel anytime
          </p>
        </div>
      </div>

      {/* ── Proof point cards below image ── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {proofPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.heading}
                className="rounded-2xl px-6 py-5"
                style={{
                  backgroundColor: "rgba(255,254,250,0.92)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid var(--easa-color-border)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  className="mb-3 text-[var(--easa-color-brand-primary)]"
                  aria-hidden="true"
                />
                <p
                  className="mb-1 text-sm font-semibold"
                  style={{ color: "var(--easa-color-text-primary)" }}
                >
                  {point.heading}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {point.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
