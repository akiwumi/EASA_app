 "use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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
  const visibleSlides = 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const loopCards = [...cards, ...cards.slice(0, visibleSlides)];

  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(() => {
      setIsTransitionEnabled(true);
      setActiveIndex((current) => current + 1);
    }, 3500);

    return () => window.clearInterval(interval);
  }, [isPaused]);

  function handleTrackTransitionEnd() {
    if (activeIndex < cards.length) return;
    // Seamlessly jump back to the real first pair after showing clone slides.
    setIsTransitionEnabled(false);
    setActiveIndex(0);
  }

  const slideGapPx = 15;
  const carouselWidthPx = 1196;
  const carouselHeightPx = 800;
  const slideWidthPx = 1109;
  const slideHeightPx = 697;
  const imageHeightPx = 540;
  const slideInsetPx = (carouselWidthPx - slideWidthPx) / 2;
  const trackTranslatePx = activeIndex * -(slideWidthPx + slideGapPx);

  useEffect(() => {
    if (isTransitionEnabled) return;
    const id = window.requestAnimationFrame(() => {
      setIsTransitionEnabled(true);
    });
    return () => window.cancelAnimationFrame(id);
  }
  , [isTransitionEnabled]);

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

        <div
          className="mx-auto overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{ width: `${carouselWidthPx}px`, height: `${carouselHeightPx}px` }}
        >
          <div
            className={`flex h-full items-center ${isTransitionEnabled ? "transition-transform duration-700 ease-out" : ""}`}
            style={{
              gap: `${slideGapPx}px`,
              paddingLeft: `${slideInsetPx}px`,
              paddingRight: `${slideInsetPx}px`,
              transform: `translateX(${trackTranslatePx}px)`,
            }}
            onTransitionEnd={handleTrackTransitionEnd}
          >
            {loopCards.map((card, index) => (
              <article
                key={`${card.title}-${index}`}
                className="flex shrink-0 flex-col"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                style={{ width: `${slideWidthPx}px`, height: `${slideHeightPx}px` }}
              >
                <Link
                  href={card.href}
                  aria-label={card.linkLabel}
                  className="relative block w-full overflow-hidden rounded-xl border border-transparent bg-transparent"
                  style={{ height: `${imageHeightPx}px` }}
                >
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="1109px"
                    className="h-full w-full object-contain"
                  />
                </Link>
                <div className="flex flex-1 flex-col justify-center bg-transparent px-4 text-center">
                  <h3 className="text-xl font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {card.body}
                  </p>
                  <Link
                    href={card.href}
                    aria-label={card.linkLabel}
                    className="mt-4 text-sm font-medium text-foreground hover:underline"
                  >
                    Learn more →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
