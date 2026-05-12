import Link from "next/link";
import { fetchAiScrapedUpdates } from "@/lib/ai-scraper";
import { getOrgAccessContext } from "@/lib/supabase/access";
import ExportResultsButton from "@/components/results/ExportResultsButton";
import UpdatedResultsSection from "@/components/results/UpdatedResultsSection";

export default async function ResultsPage() {
  const ctx = await getOrgAccessContext();
  const results = await fetchAiScrapedUpdates(ctx?.orgId);

  return (
    <div className="space-y-6">
      <header className="easa-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs text-[var(--easa-color-text-muted)]">
            AI RSS ingestion · {results.updatedAt}
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Collated results</h1>
          <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
            Updates parsed from EASA RSS feeds and mapped to your flight books.
          </p>
          {results.fallbackReason ? (
            <p className="mt-3 rounded-[12px] border border-[var(--easa-color-accent-orange)]/25 bg-[var(--easa-color-accent-orange)]/8 px-3 py-2 text-sm text-[var(--easa-color-text-secondary)]">
              {results.fallbackReason}
            </p>
          ) : null}
          {results.updatedAt === "Login required" ? (
            <p className="mt-3 text-sm text-[var(--easa-color-text-muted)]">
              Please sign in to view organisation-specific results.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="easa-btn secondary" href="/dashboard">
            Back to dashboard
          </Link>
          <ExportResultsButton items={results.items} />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="easa-card p-5">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Total updates</p>
          <p className="mt-2 text-2xl font-semibold">{results.items.length}</p>
          <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
            {results.source === "mock" ? "Seeded mock updates" : "From RSS feeds, ready for review"}
          </p>
        </div>
        <div className="easa-card p-5">
          <p className="text-xs text-[var(--easa-color-text-muted)]">By category</p>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(results.byCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span>{category}</span>
                <span className="text-[var(--easa-color-text-muted)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="easa-card p-5">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Impact mix</p>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(results.byImpact).map(([impact, count]) => (
              <div key={impact} className="flex items-center justify-between">
                <span>{impact}</span>
                <span className="text-[var(--easa-color-text-muted)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <UpdatedResultsSection items={results.items} deletedItems={results.deletedItems} />
    </div>
  );
}
