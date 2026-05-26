"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const cards = [
  {
    title: "Compliance overview",
    body: "See pending EASA changes, manuals due for review, and acknowledgement rates from one quiet dashboard.",
    image: "/images/dashboard-overview.jpg",
    alt: "Flight Lyceum compliance dashboard showing pending EASA changes and acknowledgement rates",
    href: "/how-it-works",
    linkLabel: "See how compliance monitoring works",
  },
  {
    title: "AI impact assessment",
    body: "When a regulation changes, AI flags affected manual sections and drafts plain-language updates. Your team has the final say before anything is applied.",
    image: "/images/change-impact-review.jpg",
    alt: "AI impact assessment screen showing regulation change review and manual update approval",
    href: "/how-it-works",
    linkLabel: "See how AI impact assessment works",
  },
  {
    title: "Time machine rollback",
    body: "Restore any manual section to a previous version by date. Every approval, edit, and rollback stays in the audit trail.",
    image: "/images/dashboard-overview.jpg",
    alt: "Flight Lyceum dashboard showing compliance timeline and version history",
    href: "/how-it-works",
    linkLabel: "See how Time machine rollback works",
  },
  {
    title: "Read & acknowledge",
    body: "Assign reading to instructors and students. Know exactly who has read, who hasn't, and when.",
    image: "/images/acknowledgement-tracking.jpg",
    alt: "Acknowledgement tracking view showing which staff have read and confirmed procedure updates",
    href: "/how-it-works",
    linkLabel: "See how read and acknowledge works",
  },
  {
    title: "Mobile-first for students",
    body: "Students read, understand, and acknowledge updates from their phone, before the next lesson.",
    image: "/images/mobile-student-view.jpg",
    alt: "Mobile view of Flight Lyceum showing a student reading and acknowledging a training update",
    href: "/how-it-works",
    linkLabel: "See how mobile access works for students",
  },
];

export default function FeaturesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const announceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const goTo = useCallback((index: number) => {
    setActiveIndex(((index % cards.length) + cards.length) % cards.length);
  }, []);

  const prev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  useEffect(() => {
    if (isPaused || reducedMotion) return;
    const id = window.setInterval(() => goTo(activeIndex + 1), 4000);
    return () => window.clearInterval(id);
  }, [isPaused, reducedMotion, activeIndex, goTo]);

  /* Announce slide change to screen readers */
  useEffect(() => {
    if (announceRef.current) {
      announceRef.current.textContent = `Feature ${activeIndex + 1} of ${cards.length}: ${cards[activeIndex].title}`;
    }
  }, [activeIndex]);

  return (
    <section
      id="features"
      aria-label="Product features"
      className="py-16 md:py-20"
      style={{ backgroundColor: "oklab(0.94 -0.00964181 0.0114907 / 0.4)" }}
    >
      {/* Screen reader live region for carousel announcements */}
      <div
        ref={announceRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="easa-eyebrow mb-3">Features</p>
          <h2
            className="text-4xl font-normal tracking-tight text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Built for the way ATOs actually work.
          </h2>
        </div>

        {/* ── Carousel ── fully responsive, no hardcoded pixel widths ── */}
        <div
          role="region"
          aria-label="Feature screenshots"
          className="relative overflow-hidden rounded-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          {/* Track */}
          <div
            className="flex"
            style={{
              transform: `translateX(-${activeIndex * 100}%)`,
              transition: reducedMotion ? "none" : "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {cards.map((card, index) => (
              <article
                key={card.title}
                className="w-full flex-none"
                aria-hidden={index !== activeIndex}
                aria-label={card.title}
              >
                {/* Screenshot */}
                <Link
                  href={card.href}
                  aria-label={card.linkLabel}
                  tabIndex={index !== activeIndex ? -1 : undefined}
                  className="relative block w-full overflow-hidden rounded-xl border border-transparent bg-transparent"
                  style={{ aspectRatio: "16/9" }}
                >
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1100px"
                    className="object-contain"
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </Link>

                {/* Card body */}
                <div className="px-4 py-6 text-center">
                  <h3 className="text-xl font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {card.body}
                  </p>
                  <Link
                    href={card.href}
                    aria-label={card.linkLabel}
                    tabIndex={index !== activeIndex ? -1 : undefined}
                    className="mt-4 inline-block text-sm font-medium text-foreground hover:underline"
                  >
                    Learn more →
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Prev / Next buttons */}
          <button
            type="button"
            aria-label="Previous feature"
            onClick={prev}
            className="absolute left-3 top-1/3 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white hover:shadow-md"
          >
            <ChevronLeft size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next feature"
            onClick={next}
            className="absolute right-3 top-1/3 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white hover:shadow-md"
          >
            <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {/* Dot indicators */}
        <div
          role="tablist"
          aria-label="Feature navigation"
          className="mt-5 flex items-center justify-center gap-2"
        >
          {cards.map((card, i) => (
            <button
              key={card.title}
              role="tab"
              type="button"
              aria-selected={i === activeIndex}
              aria-label={`Go to feature: ${card.title}`}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? 24 : 8,
                height: 8,
                background:
                  i === activeIndex
                    ? "var(--easa-color-brand-primary)"
                    : "var(--easa-color-surface-3)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
