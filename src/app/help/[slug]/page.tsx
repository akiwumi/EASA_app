import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/home/Nav";
import Footer from "@/components/home/Footer";
import { isUserSignedIn } from "@/lib/supabase/server";
import {
  ARTICLES,
  CATEGORIES,
  getArticleBySlug,
  getRelatedArticles,
} from "@/lib/help/articles";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle, Clock, Info, Lightbulb } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const signedIn = await isUserSignedIn();
  const related = getRelatedArticles(article);
  const category = CATEGORIES.find((c) => c.slug === article.categorySlug);

  // Prev / next within same category
  const catArticles = ARTICLES.filter((a) => a.categorySlug === article.categorySlug);
  const idx = catArticles.findIndex((a) => a.slug === slug);
  const prev = idx > 0 ? catArticles[idx - 1] : null;
  const next = idx < catArticles.length - 1 ? catArticles[idx + 1] : null;

  return (
    <div className="min-h-screen bg-[var(--easa-color-bg)]">
      <Nav signedIn={signedIn} />

      <main className="easa-shell py-12 lg:py-20">
        <div className="mx-auto max-w-4xl">

          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-sm text-[var(--easa-color-text-muted)]">
            <Link href="/help" className="hover:text-[var(--easa-color-brand-primary)] hover:underline">
              Help Center
            </Link>
            <span>/</span>
            <Link
              href={`/help#${article.categorySlug}`}
              className="hover:text-[var(--easa-color-brand-primary)] hover:underline"
            >
              {category?.label ?? article.category}
            </Link>
            <span>/</span>
            <span className="max-w-xs truncate text-[var(--easa-color-text-secondary)]">
              {article.title}
            </span>
          </nav>

          <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-12">

            {/* Article body */}
            <article>
              {/* Header */}
              <header className="mb-8">
                <div className="mb-3 flex items-center gap-2 text-xs text-[var(--easa-color-text-muted)]">
                  <span className="rounded-full bg-[var(--easa-color-brand-light)] px-2.5 py-1 font-semibold text-[var(--easa-color-brand-primary)]">
                    {category?.icon} {category?.label ?? article.category}
                  </span>
                  <span>·</span>
                  <Clock size={11} strokeWidth={2} />
                  <span>{article.readingTime} min read</span>
                </div>
                <h1 className="easa-display text-3xl font-semibold leading-tight text-[var(--easa-color-text-primary)] lg:text-4xl">
                  {article.title}
                </h1>
                <p className="mt-3 text-base leading-relaxed text-[var(--easa-color-text-muted)]">
                  {article.intro}
                </p>
              </header>

              {/* Sections */}
              <div className="space-y-8">
                {article.sections.map((section, i) => (
                  <section key={i} id={`section-${i}`} className="scroll-mt-24">
                    <h2 className="mb-3 text-lg font-semibold text-[var(--easa-color-text-primary)]">
                      {section.heading}
                    </h2>
                    <p className="text-sm leading-relaxed text-[var(--easa-color-text-secondary)]">
                      {section.body}
                    </p>

                    {section.steps && (
                      <ol className="mt-4 space-y-2">
                        {section.steps.map((step, si) => (
                          <li key={si} className="flex gap-3 text-sm">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--easa-color-brand-light)] text-[10px] font-bold text-[var(--easa-color-brand-primary)]">
                              {si + 1}
                            </span>
                            <span className="leading-relaxed text-[var(--easa-color-text-secondary)]">{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {section.bullets && (
                      <ul className="mt-4 space-y-2">
                        {section.bullets.map((b, bi) => (
                          <li key={bi} className="flex gap-2.5 text-sm leading-relaxed text-[var(--easa-color-text-secondary)]">
                            <CheckCircle
                              size={14}
                              strokeWidth={2}
                              className="mt-0.5 shrink-0 text-[var(--easa-color-accent-green)]"
                            />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.tip && (
                      <div className="mt-4 flex gap-3 rounded-xl border border-[var(--easa-color-accent-blue)] border-opacity-30 bg-blue-50/60 px-4 py-3">
                        <Lightbulb
                          size={15}
                          strokeWidth={2}
                          className="mt-0.5 shrink-0 text-[var(--easa-color-accent-blue)]"
                        />
                        <p className="text-xs leading-relaxed text-[var(--easa-color-text-secondary)]">
                          <span className="font-semibold text-[var(--easa-color-accent-blue)]">Tip: </span>
                          {section.tip}
                        </p>
                      </div>
                    )}

                    {section.warning && (
                      <div className="mt-4 flex gap-3 rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-3">
                        <AlertTriangle
                          size={15}
                          strokeWidth={2}
                          className="mt-0.5 shrink-0 text-amber-600"
                        />
                        <p className="text-xs leading-relaxed text-[var(--easa-color-text-secondary)]">
                          <span className="font-semibold text-amber-600">Note: </span>
                          {section.warning}
                        </p>
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {/* Was this helpful */}
              <div className="mt-12 rounded-2xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--easa-color-text-muted)]">
                  <Info size={14} strokeWidth={2} />
                  <span>Was this article helpful?</span>
                </div>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <Link
                    href="/contact"
                    className="rounded-xl border border-[var(--easa-color-border)] bg-white px-4 py-2 text-xs font-medium text-[var(--easa-color-text-secondary)] transition hover:border-[var(--easa-color-brand-primary)] hover:text-[var(--easa-color-brand-primary)]"
                  >
                    No — I need more help
                  </Link>
                  <Link
                    href="/help"
                    className="rounded-xl border border-[var(--easa-color-border)] bg-white px-4 py-2 text-xs font-medium text-[var(--easa-color-text-secondary)] transition hover:border-[var(--easa-color-brand-primary)] hover:text-[var(--easa-color-brand-primary)]"
                  >
                    Yes, thanks!
                  </Link>
                </div>
              </div>

              {/* Prev / Next navigation */}
              {(prev || next) && (
                <nav className="mt-8 grid grid-cols-2 gap-4">
                  {prev ? (
                    <Link
                      href={`/help/${prev.slug}`}
                      className="group flex flex-col gap-1 rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-4 transition hover:border-[var(--easa-color-brand-primary)]"
                    >
                      <span className="flex items-center gap-1.5 text-xs text-[var(--easa-color-text-muted)]">
                        <ArrowLeft size={11} strokeWidth={2} />
                        Previous
                      </span>
                      <span className="text-sm font-medium text-[var(--easa-color-text-primary)] transition group-hover:text-[var(--easa-color-brand-primary)]">
                        {prev.title}
                      </span>
                    </Link>
                  ) : (
                    <div />
                  )}
                  {next ? (
                    <Link
                      href={`/help/${next.slug}`}
                      className="group flex flex-col items-end gap-1 rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-4 text-right transition hover:border-[var(--easa-color-brand-primary)]"
                    >
                      <span className="flex items-center gap-1.5 text-xs text-[var(--easa-color-text-muted)]">
                        Next
                        <ArrowRight size={11} strokeWidth={2} />
                      </span>
                      <span className="text-sm font-medium text-[var(--easa-color-text-primary)] transition group-hover:text-[var(--easa-color-brand-primary)]">
                        {next.title}
                      </span>
                    </Link>
                  ) : (
                    <div />
                  )}
                </nav>
              )}
            </article>

            {/* Sidebar */}
            <aside className="mt-10 lg:mt-0">
              <div className="sticky top-8 space-y-6">

                {/* Table of contents */}
                <div className="rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--easa-color-text-muted)]">
                    In this article
                  </p>
                  <ul className="space-y-1.5">
                    {article.sections.map((section, i) => (
                      <li key={i}>
                        <a
                          href={`#section-${i}`}
                          className="block text-xs leading-snug text-[var(--easa-color-text-secondary)] transition hover:text-[var(--easa-color-brand-primary)]"
                        >
                          {section.heading}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Related articles */}
                {related.length > 0 && (
                  <div className="rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--easa-color-text-muted)]">
                      Related articles
                    </p>
                    <ul className="space-y-3">
                      {related.map((rel) => (
                        <li key={rel.slug}>
                          <Link
                            href={`/help/${rel.slug}`}
                            className="group flex items-start gap-2"
                          >
                            <BookOpen
                              size={12}
                              strokeWidth={1.75}
                              className="mt-0.5 shrink-0 text-[var(--easa-color-text-muted)]"
                            />
                            <span className="text-xs leading-snug text-[var(--easa-color-text-secondary)] transition group-hover:text-[var(--easa-color-brand-primary)]">
                              {rel.title}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Help CTA */}
                <div className="rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-5">
                  <p className="text-xs font-semibold text-[var(--easa-color-text-primary)]">
                    Need more help?
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--easa-color-text-muted)]">
                    Our team can walk you through any workflow specific to your school.
                  </p>
                  <Link
                    href="/contact"
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--easa-color-brand-primary)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    Contact us
                    <ArrowRight size={11} strokeWidth={2.5} />
                  </Link>
                </div>

              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
