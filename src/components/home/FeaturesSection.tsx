import Image from "next/image";
import Link from "next/link";

const cards = [
  {
    title: "Compliance overview",
    body: "See pending EASA changes, manuals due for review, and acknowledgement rates from one quiet dashboard.",
    image: "/images/dashboard-overview.jpg",
    alt: "Compliance overview",
  },
  {
    title: "AI impact assessment",
    body: "When a regulation changes, the AI flags affected manual sections and drafts a plain-language replacement. Your team approves.",
    image: "/images/change-impact-review.jpg",
    alt: "AI impact assessment",
  },
  {
    title: "Read & acknowledge",
    body: "Assign reading to instructors and students. Know exactly who has read, who hasn't, and when.",
    image: "/images/acknowledgement-tracking.jpg",
    alt: "Read & acknowledge",
  },
  {
    title: "Mobile-first for students",
    body: "Students read, understand, and acknowledge updates from their phone — before the next lesson.",
    image: "/images/mobile-student-view.jpg",
    alt: "Mobile-first for students",
  },
];

export default function FeaturesSection() {
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

        <div className="easa-mobile-carousel grid gap-6 md:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.title}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {card.body}
                </p>
                <Link
                  href="/#features"
                  className="mt-4 text-sm font-medium text-foreground hover:underline"
                >
                  Learn more →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
