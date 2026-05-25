 "use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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

  function goToNext() {
    setActiveIndex((current) => (current + 1) % cards.length);
  }

  function goToPrevious() {
    setActiveIndex((current) => (current - 1 + cards.length) % cards.length);
  }

  const activeCard = cards[activeIndex];

  return (
    <section
      id="features"
      className="py-[20px]"
      style={{
        backgroundColor: "oklab(0.94 -0.00964181 0.0114907 / 0.4)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            Features
          </p>
          <h2
            className="text-4xl font-normal tracking-tight text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Built for the way ATOs actually work.
          </h2>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
              <Image
                src={activeCard.image}
                alt={activeCard.alt}
                fill
                sizes="(min-width: 768px) 55vw, 92vw"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-1 flex-col p-6">
              <h3 className="text-lg font-semibold text-foreground">
                {activeCard.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {activeCard.body}
              </p>
              <Link
                href={activeCard.href}
                aria-label={activeCard.linkLabel}
                className="mt-4 text-sm font-medium text-foreground hover:underline"
              >
                Learn more →
              </Link>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Previous feature image"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {cards.map((card, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={card.title}
                    type="button"
                    aria-label={`Go to ${card.title}`}
                    aria-current={isActive}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full transition ${
                      isActive
                        ? "w-7 bg-foreground"
                        : "w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/60"
                    }`}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={goToNext}
              aria-label="Next feature image"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
