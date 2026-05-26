import type { Metadata } from "next";
import Nav from "@/components/home/Nav";
import Footer from "@/components/home/Footer";
import ContactForm from "@/components/contact/ContactForm";
import MarketingAnimations from "@/components/marketing/MarketingAnimations";
import { isUserSignedIn } from "@/lib/supabase/server";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Flight Lyceum team. We're here to help ATOs and flight schools get the most from the platform.",
};

export default async function ContactPage() {
  const signedIn = await isUserSignedIn();

  return (
    <div className="min-h-screen" style={{ background: "var(--mkt-cream)" }}>
      <MarketingAnimations />
      <Nav signedIn={signedIn} />

      {/* ── Dark hero ── */}
      <section className="mkt-hero mkt-page-enter">
        <p className="mkt-eyebrow mkt-mono mb-5">Get in touch</p>
        <h1 className="mkt-h1" style={{ color: "var(--mkt-cream)" }}>
          We&rsquo;d love to hear<br />from you
        </h1>
        <p className="mkt-lead mt-6">
          Whether you have a question about the platform, want to book a demo, or just want to say hello — our team is ready to help.
        </p>
      </section>

      {/* ── Content grid ── */}
      <main id="main-content" className="mkt-section">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-5">

          {/* Contact info sidebar */}
          <div className="space-y-6 lg:col-span-2">

            <div
              className="mkt-card mkt-reveal p-6"
              style={{ "--mkt-d": "80ms" } as React.CSSProperties}
            >
              <h2 className="mkt-eyebrow mkt-mono mb-5" style={{ color: "var(--easa-color-text-muted)", opacity: 1 }}>
                Contact details
              </h2>
              <ul className="space-y-5">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--easa-color-brand-light)" }}>
                    <Mail size={15} strokeWidth={1.75} style={{ color: "var(--mkt-ink)" }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--easa-color-text-muted)" }}>Email</p>
                    <a
                      href="mailto:hello@flightlyceum.com"
                      className="mt-1 block text-sm font-medium hover:underline"
                      style={{ color: "var(--mkt-ink)" }}
                    >
                      hello@flightlyceum.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--easa-color-brand-light)" }}>
                    <Phone size={15} strokeWidth={1.75} style={{ color: "var(--mkt-ink)" }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--easa-color-text-muted)" }}>Phone</p>
                    <a
                      href="tel:+447700000000"
                      className="mt-1 block text-sm font-medium hover:underline"
                      style={{ color: "var(--mkt-ink)" }}
                    >
                      +44 7700 000 000
                    </a>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--easa-color-text-muted)" }}>Mon–Fri, 09:00–17:00 GMT</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--easa-color-brand-light)" }}>
                    <MapPin size={15} strokeWidth={1.75} style={{ color: "var(--mkt-ink)" }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--easa-color-text-muted)" }}>Location</p>
                    <p className="mt-1 text-sm font-medium" style={{ color: "var(--mkt-ink)" }}>United Kingdom</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--easa-color-text-muted)" }}>Serving ATOs across Europe</p>
                  </div>
                </li>
              </ul>
            </div>

            <div
              className="mkt-card mkt-reveal p-6"
              style={{ "--mkt-d": "180ms" } as React.CSSProperties}
            >
              <h2 className="mkt-eyebrow mkt-mono mb-3" style={{ color: "var(--easa-color-text-muted)", opacity: 1 }}>
                Book a demo
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--easa-color-text-muted)" }}>
                See Flight Lyceum in action with a personalised 30-minute walkthrough tailored to your school.
              </p>
              <a
                href="mailto:hello@flightlyceum.com?subject=Demo request"
                className="easa-btn primary mt-4 inline-flex w-full items-center justify-center gap-2 text-sm"
              >
                <Mail size={15} strokeWidth={1.75} />
                Request a demo
              </a>
            </div>
          </div>

          {/* Contact form */}
          <div
            className="mkt-card mkt-reveal p-6 lg:col-span-3"
            style={{ "--mkt-d": "140ms" } as React.CSSProperties}
          >
            <h2 className="mkt-h3 mkt-serif" style={{ color: "var(--mkt-ink)" }}>
              Send us a message
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--easa-color-text-muted)" }}>
              We typically respond within one business day.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
