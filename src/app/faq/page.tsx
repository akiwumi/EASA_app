import type { Metadata } from "next";
import Nav from "@/components/home/Nav";
import Footer from "@/components/home/Footer";
import { isUserSignedIn } from "@/lib/supabase/server";
import { ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Flight Lyceum — the compliance and training platform built for EASA Approved Training Organisations.",
};

const faqs = [
  {
    category: "Getting started",
    items: [
      {
        q: "What is Flight Lyceum?",
        a: "Flight Lyceum is a compliance and training management platform built specifically for EASA Approved Training Organisations (ATOs) and flight schools. It helps you monitor regulation changes, control your manuals, assign reading by lesson, and track every student and instructor acknowledgement — all in one place.",
      },
      {
        q: "How do I get my school on the platform?",
        a: "Register your school on the registration page and you'll have your organisation set up within minutes. You can then invite instructors and students, upload your manuals, and start tracking compliance immediately. If you'd prefer a guided walkthrough, request a demo and our team will be in touch.",
      },
      {
        q: "Is there a free trial?",
        a: "Yes — new schools get a 30-day free trial with full access to all features. A card is required to start but you won't be charged until day 31. After the trial, choose monthly or annual billing.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. Flight Lyceum is a fully web-based platform — it works in any modern browser on desktop, tablet, or mobile. There is nothing to install or maintain.",
      },
    ],
  },
  {
    category: "Compliance & regulations",
    items: [
      {
        q: "Which EASA regulations does Flight Lyceum monitor?",
        a: "Flight Lyceum tracks changes across the full EASA regulatory library relevant to ATOs: Part-FCL, Part-ORA, AMC/GM publications, and EASA Opinion and Decision documents. You can configure which document types and categories your organisation follows.",
      },
      {
        q: "How quickly are regulation changes detected?",
        a: "Our monitoring system checks official EASA sources daily. When a relevant change is detected, affected sections in your flight books are flagged automatically and your team is notified.",
      },
      {
        q: "Can I upload my own manuals and training documentation?",
        a: "Yes. You can upload your Operations Manual, Training Manual, MEL, or any other document in PDF, TXT, Markdown, or JSON format. The system parses each document into indexed sections so the AI can compare them against updated regulations.",
      },
      {
        q: "What happens when a regulation changes?",
        a: "When a change is detected, Flight Lyceum creates a review item in your queue showing exactly which sections of your manuals may be affected. Your compliance team can review the AI comparison, approve or reject the proposed update, and generate a new date-stamped copy of the manual automatically.",
      },
    ],
  },
  {
    category: "Training management",
    items: [
      {
        q: "How does reading assignment work?",
        a: "Instructors can assign specific sections of any flight book directly to a training lesson. Students see their assigned reading in their dashboard, mark sections as read, and the system logs every acknowledgement with a timestamp for your audit trail.",
      },
      {
        q: "Can students and instructors access the platform on their phones?",
        a: "Yes. Flight Lyceum is fully responsive and works as a progressive web app (PWA) on iOS and Android. Students can read assigned material and mark acknowledgements directly from their phone.",
      },
      {
        q: "Does Flight Lyceum support multiple aircraft types?",
        a: "Yes. You can tag flight books and lessons to specific aircraft types, making it easy to filter training materials and ensure students are reading the right documentation for their type rating or endorsement.",
      },
    ],
  },
  {
    category: "Account & billing",
    items: [
      {
        q: "How is pricing structured?",
        a: "Flight Lyceum is priced per organisation. See the pricing page for current plans. All plans include unlimited manuals, compliance monitoring, and student tracking — plans differ by the number of active users.",
      },
      {
        q: "Can I add multiple admins to my school account?",
        a: "Yes. You can invite as many administrators and instructors as your plan allows. Each person gets their own login and role-based access — admins manage settings and manuals, instructors manage training, students access their assigned reading.",
      },
      {
        q: "What happens to my data if I cancel?",
        a: "Your data remains accessible for 30 days after cancellation so you can export anything you need. After that, data is permanently deleted in line with our privacy policy. We never sell or share your data.",
      },
      {
        q: "Is my data stored securely?",
        a: "Yes. Flight Lyceum is built on Supabase, with all data stored in the EU. Data is encrypted at rest and in transit. Row-level security policies ensure each organisation can only access their own data.",
      },
    ],
  },
];

export default async function FaqPage() {
  const signedIn = await isUserSignedIn();

  return (
    <div className="min-h-screen bg-[var(--easa-color-bg)]">
      <Nav signedIn={signedIn} />

      <main className="easa-shell py-16 lg:py-24">

        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="easa-eyebrow">Frequently asked questions</span>
          <h1 className="easa-display mt-4 text-4xl font-semibold leading-tight text-[var(--easa-color-text-primary)] lg:text-5xl">
            Got questions? We&rsquo;ve got answers.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--easa-color-text-muted)]">
            Everything you need to know about Flight Lyceum. Can&rsquo;t find what you&rsquo;re looking for?{" "}
            <a href="/contact" className="font-medium text-[var(--easa-color-brand-primary)] hover:underline">
              Get in touch
            </a>.
          </p>
        </div>

        {/* FAQ sections */}
        <div className="mx-auto mt-16 max-w-3xl space-y-12">
          {faqs.map((section) => (
            <section key={section.category}>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--easa-color-text-muted)]">
                {section.category}
              </h2>
              <div className="divide-y divide-[var(--easa-color-border)] rounded-2xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)]">
                {section.items.map((item) => (
                  <details key={item.q} className="group px-6 py-5">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold text-[var(--easa-color-text-primary)] marker:hidden [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown
                        size={16}
                        strokeWidth={2}
                        className="mt-0.5 shrink-0 text-[var(--easa-color-text-muted)] transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--easa-color-text-muted)]">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <div className="easa-card p-8">
            <h2 className="text-xl font-semibold text-[var(--easa-color-text-primary)]">
              Still have questions?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--easa-color-text-muted)]">
              Our team is happy to walk you through how Flight Lyceum works for your school.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/contact"
                className="easa-btn primary text-sm"
              >
                Contact us
              </a>
              <a
                href="mailto:hello@flightlyceum.com?subject=Demo request"
                className="easa-btn secondary text-sm"
              >
                Request a demo
              </a>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
