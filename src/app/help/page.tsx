import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/home/Nav";
import Footer from "@/components/home/Footer";
import { isUserSignedIn } from "@/lib/supabase/server";
import { ARTICLES, CATEGORIES } from "@/lib/help/articles";
import { ArrowRight, BookOpen, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Step-by-step guides and articles covering every workflow in Flight Lyceum — from your first upload to exporting audit records.",
};

export default async function HelpIndexPage() {
  const signedIn = await isUserSignedIn();

  return (
    <div className="min-h-screen bg-[var(--easa-color-bg)]">
      <Nav signedIn={signedIn} />

      <main className="easa-shell py-16 lg:py-24">

        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="easa-eyebrow">Help Center</span>
          <h1 className="easa-display mt-4 text-4xl font-semibold leading-tight text-[var(--easa-color-text-primary)] lg:text-5xl">
            How can we help?
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--easa-color-text-muted)]">
            Step-by-step guides for every Flight Lyceum workflow. Can&rsquo;t find what you need?{" "}
            <Link href="/contact" className="font-medium text-[var(--easa-color-brand-primary)] hover:underline">
              Contact our team.
            </Link>
          </p>
        </div>

        {/* Category grid */}
        <div className="mx-auto mt-14 max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const catArticles = ARTICLES.filter((a) => a.categorySlug === cat.slug);
              return (
                <Link
                  key={cat.slug}
                  href={`#${cat.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-6 transition hover:border-[var(--easa-color-brand-primary)] hover:shadow-[var(--easa-shadow-1)]"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <h2 className="font-semibold text-[var(--easa-color-text-primary)] group-hover:text-[var(--easa-color-brand-primary)]">
                      {cat.label}
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                      {catArticles.length} article{catArticles.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Articles by category */}
        <div className="mx-auto mt-16 max-w-5xl space-y-14">
          {CATEGORIES.map((cat) => {
            const catArticles = ARTICLES.filter((a) => a.categorySlug === cat.slug);
            return (
              <section key={cat.slug} id={cat.slug}>
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="text-lg font-semibold text-[var(--easa-color-text-primary)]">
                    {cat.label}
                  </h2>
                </div>
                <div className="divide-y divide-[var(--easa-color-border)] rounded-2xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)]">
                  {catArticles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/help/${article.slug}`}
                      className="group flex items-start gap-4 px-6 py-5 transition hover:bg-[var(--easa-color-surface-2)]"
                    >
                      <BookOpen
                        size={18}
                        strokeWidth={1.75}
                        className="mt-0.5 shrink-0 text-[var(--easa-color-text-muted)] transition group-hover:text-[var(--easa-color-brand-primary)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--easa-color-text-primary)] transition group-hover:text-[var(--easa-color-brand-primary)]">
                          {article.title}
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed text-[var(--easa-color-text-muted)]">
                          {article.description}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--easa-color-text-disabled)]">
                          <Clock size={11} strokeWidth={2} />
                          {article.readingTime} min read
                        </div>
                      </div>
                      <ArrowRight
                        size={16}
                        strokeWidth={1.75}
                        className="mt-1 shrink-0 text-[var(--easa-color-text-muted)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Still need help */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <div className="easa-card p-8">
            <h2 className="text-xl font-semibold text-[var(--easa-color-text-primary)]">
              Still need help?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--easa-color-text-muted)]">
              Our team is happy to walk you through any workflow or answer questions specific to your school.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/contact" className="easa-btn primary text-sm">
                Contact us
              </Link>
              <Link href="/faq" className="easa-btn secondary text-sm">
                Browse FAQ
              </Link>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
