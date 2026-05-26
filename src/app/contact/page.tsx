import type { Metadata } from "next";
import Nav from "@/components/home/Nav";
import Footer from "@/components/home/Footer";
import ContactForm from "@/components/contact/ContactForm";
import { isUserSignedIn } from "@/lib/supabase/server";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Flight Lyceum team. We're here to help ATOs and flight schools get the most from the platform.",
};

export default async function ContactPage() {
  const signedIn = await isUserSignedIn();

  return (
    <div className="min-h-screen bg-[var(--easa-color-bg)]">
      <Nav signedIn={signedIn} />

      <main id="main-content" className="easa-shell py-16 lg:py-24">

        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="easa-eyebrow">Get in touch</span>
          <h1 className="easa-display mt-4 text-4xl font-semibold leading-tight text-[var(--easa-color-text-primary)] lg:text-5xl">
            We&rsquo;d love to hear from you
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--easa-color-text-muted)]">
            Whether you have a question about the platform, want to book a demo, or just want to say hello, our team is ready to help.
          </p>
        </div>

        {/* Grid */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-5">

          {/* Contact info */}
          <div className="space-y-6 lg:col-span-2">
            <div className="easa-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--easa-color-text-muted)]">
                Contact details
              </h2>
              <ul className="mt-5 space-y-5">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--easa-color-brand-light)]">
                    <Mail size={15} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--easa-color-text-muted)]">Email</p>
                    <a
                      href="mailto:hello@flightlyceum.com"
                      className="mt-0.5 block text-sm font-medium text-[var(--easa-color-text-primary)] hover:text-[var(--easa-color-brand-primary)] hover:underline"
                    >
                      hello@flightlyceum.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--easa-color-brand-light)]">
                    <Phone size={15} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--easa-color-text-muted)]">Phone</p>
                    <a
                      href="tel:+447700000000"
                      className="mt-0.5 block text-sm font-medium text-[var(--easa-color-text-primary)] hover:text-[var(--easa-color-brand-primary)] hover:underline"
                    >
                      +44 7700 000 000
                    </a>
                    <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">Mon–Fri, 09:00–17:00 GMT</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--easa-color-brand-light)]">
                    <MapPin size={15} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--easa-color-text-muted)]">Location</p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--easa-color-text-primary)]">
                      United Kingdom
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">Serving ATOs across Europe</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="easa-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--easa-color-text-muted)]">
                Book a demo
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--easa-color-text-muted)]">
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
          <div className="easa-card p-6 lg:col-span-3">
            <h2 className="text-base font-semibold text-[var(--easa-color-text-primary)]">Send us a message</h2>
            <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
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
