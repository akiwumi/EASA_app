import Image from "next/image";
import { featureCards } from "@/components/landing/site-content";

export default function LandingFeatures() {
  return (
    <section id="features" className="rounded-[40px] bg-[rgba(255,253,248,0.55)] px-6 py-10 md:px-8 md:py-14">
      <div className="mb-10 text-center">
        <span className="easa-eyebrow justify-center">Features</span>
        <h2 className="easa-display mt-4 text-4xl md:text-6xl">
          Built for the way ATOs actually work.
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {featureCards.map((card) => (
          <article key={card.title} className="easa-panel overflow-hidden">
            <div className="relative aspect-[16/10] overflow-hidden bg-[var(--easa-color-surface-2)]">
              <Image
                src={card.image}
                alt={card.title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition duration-500 hover:scale-[1.02]"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-[var(--easa-color-text-primary)]">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--easa-color-text-muted)]">
                {card.body}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
