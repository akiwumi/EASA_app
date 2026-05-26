import { Quote, ShieldCheck, Globe, FileText, Users } from "lucide-react";

const stats = [
  { value: "40+", label: "EASA regulatory families monitored automatically" },
  { value: "< 5 min", label: "From EASA change detected to drafted manual update" },
  { value: "100%", label: "Audit trail — every approval, edit, and rollback logged" },
];

/* TODO: Replace with real customer testimonials before launch */
const testimonials = [
  {
    quote:
      "Before Flight Lyceum, our compliance manager spent a full day each week tracking EASA bulletins manually. Now changes are flagged automatically and a draft is ready for review in minutes. The time saving alone justified the cost.",
    name: "Sarah O.",
    role: "Head of Training",
    org: "Approved Training Organisation · 120 students",
  },
  {
    quote:
      "The time machine feature sold it for us. Being able to prove exactly which version of a procedure was in place on any given date — that's the question auditors ask. We can answer it in seconds now instead of digging through email threads.",
    name: "Marcus T.",
    role: "Accountable Manager",
    org: "Part-147 Maintenance Training Organisation",
  },
];

const trustBadges = [
  { icon: ShieldCheck, label: "GDPR compliant" },
  { icon: Globe, label: "EU-hosted infrastructure" },
  { icon: FileText, label: "Audit-ready by design" },
  { icon: Users, label: "Role-based access control" },
];

export default function SocialProofSection() {
  return (
    <section
      aria-label="Social proof and trust signals"
      className="py-16 md:py-20"
      style={{
        background:
          "linear-gradient(180deg, rgba(31,52,52,0.04) 0%, rgba(255,253,248,0) 100%)",
        borderTop: "1px solid var(--easa-color-border)",
        borderBottom: "1px solid var(--easa-color-border)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* ── Stats ── */}
        <div className="grid gap-8 text-center sm:grid-cols-3 sm:text-left">
          {stats.map((stat) => (
            <div key={stat.value}>
              <p className="easa-stat-value">{stat.value}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Testimonials ── */}
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {testimonials.map((t) => (
            <figure key={t.name} className="easa-testimonial-card">
              <Quote
                size={20}
                className="mb-4 text-[var(--easa-color-brand-primary)] opacity-40"
                aria-hidden="true"
              />
              <blockquote>
                <p className="text-sm leading-7 text-[var(--easa-color-text-secondary)]">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "var(--easa-color-brand-primary)" }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--easa-color-text-primary)]">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.role} · {t.org}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* ── Trust badges ── */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {trustBadges.map(({ icon: Icon, label }) => (
            <div key={label} className="easa-trust-badge">
              <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
