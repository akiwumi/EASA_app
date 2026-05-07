"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type {
  ApprovedUpdateSearchResult,
  ManualSearchResult,
  SearchPageData,
  SearchResponsePayload,
} from "@/services/search";

function ResultMeta({
  documentType,
  programmes,
  phases,
}: {
  documentType: string | null;
  programmes: string[];
  phases: string[];
}) {
  const chips = [
    documentType,
    ...programmes.slice(0, 2),
    ...phases.slice(0, 2),
  ].filter(Boolean) as string[];

  if (!chips.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip} className="easa-chip">
          {chip}
        </span>
      ))}
    </div>
  );
}

function LessonLinks({ lessons }: { lessons: { id: string; title: string; lessonCode: string | null }[] }) {
  if (!lessons.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-sm">
      {lessons.slice(0, 3).map((lesson) => (
        <Link
          key={lesson.id}
          href={`/training/lessons/${lesson.id}`}
          className="rounded-full bg-[var(--easa-color-surface-2)] px-3 py-2 text-[var(--easa-color-text-secondary)] transition hover:text-[var(--easa-color-text-primary)]"
        >
          {(lesson.lessonCode ? `${lesson.lessonCode} · ` : "") + lesson.title}
        </Link>
      ))}
    </div>
  );
}

function RelevanceBar({ score, max = 1 }: { score: number; max?: number }) {
  const pct = Math.round(Math.min((score / max) * 100, 100));
  const color =
    pct >= 70
      ? "bg-[var(--easa-color-accent-green)]"
      : pct >= 40
        ? "bg-[var(--easa-color-accent-teal)]"
        : "bg-[var(--easa-color-accent-blue)]";
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[var(--easa-color-text-muted)]">
        Relevance
      </span>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--easa-color-border)]">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-medium tabular-nums text-[var(--easa-color-text-secondary)]">
          {pct}%
        </span>
      </div>
    </div>
  );
}

function ManualResultCard({ result }: { result: ManualSearchResult }) {
  return (
    <article className="easa-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
            Manual match
          </p>
          <h3 className="mt-2 text-lg font-semibold">{result.title}</h3>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            {result.flightbookName}
            {result.sectionNumber ? ` · ${result.sectionNumber}` : ""}
          </p>
        </div>
        <RelevanceBar score={result.score} max={1} />
      </div>

      <p className="mt-3 text-sm text-[var(--easa-color-text-secondary)]">{result.excerpt}</p>
      <ResultMeta
        documentType={result.documentType}
        programmes={result.programmes}
        phases={result.phases}
      />
      <LessonLinks lessons={result.lessons} />

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={result.href} className="easa-btn secondary">
          Open manual
        </Link>
      </div>
    </article>
  );
}

function ApprovedUpdateCard({ result }: { result: ApprovedUpdateSearchResult }) {
  return (
    <article className="easa-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
            Approved update
          </p>
          <h3 className="mt-2 text-lg font-semibold">{result.title}</h3>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            {result.flightbookName || "Approved change"}
            {result.sectionNumber ? ` · ${result.sectionNumber}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <RelevanceBar score={result.score} max={5} />
          {result.createdAt && (
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              {new Date(result.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-[var(--easa-color-text-secondary)]">{result.excerpt}</p>
      <ResultMeta
        documentType={result.documentType}
        programmes={result.programmes}
        phases={result.phases}
      />
      <LessonLinks lessons={result.lessons} />

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={result.href} className="easa-btn secondary">
          Open approved update
        </Link>
        {result.sourceLink && (
          <a
            href={result.sourceLink}
            target="_blank"
            rel="noreferrer"
            className="easa-btn secondary"
          >
            Open source article
          </a>
        )}
      </div>
    </article>
  );
}

export default function SearchClient({ data }: { data: SearchPageData }) {
  const [query, setQuery] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [flightbookId, setFlightbookId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [payload, setPayload] = useState<SearchResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visiblePhases = useMemo(
    () => data.phases.filter((phase) => !programmeId || phase.programmeId === programmeId),
    [data.phases, programmeId],
  );

  async function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          programmeId: programmeId || null,
          phaseId: phaseId || null,
          flightbookId: flightbookId || null,
          documentType: documentType || null,
          includeAnswer: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Search failed.");
        return;
      }

      setPayload(json as SearchResponsePayload);
    });
  }

  return (
    <div className="space-y-6">
      <section className="easa-card p-6">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
            Phase 8 search
          </p>
          <h1 className="easa-h1-mobile-app mt-2 text-3xl font-semibold text-[var(--easa-color-text-primary)]">
            Search manuals and approved updates
          </h1>
          <p className="mt-3 text-sm text-[var(--easa-color-text-secondary)]">
            Search stored flight-book content and already approved changes. Grounded AI answers only use the material already in this system and always return source links.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submitSearch}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(0,1fr))]">
            <input
              className="easa-input"
              placeholder="Search a procedure, subject, or section"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="easa-input"
              value={programmeId}
              onChange={(event) => {
                setProgrammeId(event.target.value);
                setPhaseId("");
              }}
            >
              <option value="">All programmes</option>
              {data.programmes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.label}
                </option>
              ))}
            </select>
            <select
              className="easa-input"
              value={phaseId}
              onChange={(event) => setPhaseId(event.target.value)}
              disabled={!visiblePhases.length}
            >
              <option value="">All phases</option>
              {visiblePhases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.label}
                </option>
              ))}
            </select>
            <select
              className="easa-input"
              value={flightbookId}
              onChange={(event) => setFlightbookId(event.target.value)}
            >
              <option value="">All manuals</option>
              {data.flightbooks.map((flightbook) => (
                <option key={flightbook.id} value={flightbook.id}>
                  {flightbook.label}
                </option>
              ))}
            </select>
            <select
              className="easa-input"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              <option value="">All document types</option>
              {data.documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="easa-btn primary" disabled={isPending || query.trim().length < 2} type="submit">
              {isPending ? "Searching…" : "Search stored content"}
            </button>
            <p className="text-xs text-[var(--easa-color-text-muted)]">
              Role: {data.role}
            </p>
          </div>
        </form>

        {!data.trainingSchemaReady && (
          <p className="mt-4 text-sm text-[var(--easa-color-text-muted)]">
            Training-programme filters will fill out after the Phase 3 migrations are applied in Supabase.
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
        )}
      </section>

      {payload && (
        <>
          {(payload.answer.text || payload.warnings.length > 0) && (
            <section className="easa-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
                    Grounded answer
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">Answer from stored content</h2>
                </div>
                {payload.answer.provider && (
                  <span className="easa-badge is-green">{payload.answer.provider}</span>
                )}
              </div>

              {payload.answer.text ? (
                <p className="mt-4 text-sm leading-7 text-[var(--easa-color-text-secondary)]">
                  {payload.answer.text}
                </p>
              ) : (
                <p className="mt-4 text-sm text-[var(--easa-color-text-muted)]">
                  No AI answer was generated, but the cited source matches below are still available.
                </p>
              )}

              {payload.answer.citations.length > 0 && (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {payload.answer.citations.map((citation, index) => (
                    <Link
                      key={`${citation.href}-${index}`}
                      href={citation.href}
                      className="rounded-[20px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 transition hover:border-[var(--easa-color-brand-primary)]"
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
                        Source {index + 1}
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--easa-color-text-primary)]">
                        {citation.label}
                      </p>
                      {citation.secondaryLabel && (
                        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
                          {citation.secondaryLabel}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {payload.warnings.length > 0 && (
                <div className="mt-5 space-y-2">
                  {payload.warnings.map((warning) => (
                    <p key={warning} className="text-sm text-[var(--easa-color-text-muted)]">
                      {warning}
                    </p>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Manual matches</h2>
                <span className="text-sm text-[var(--easa-color-text-muted)]">
                  {payload.results.manuals.length} result{payload.results.manuals.length !== 1 ? "s" : ""}
                </span>
              </div>

              {payload.results.manuals.length === 0 ? (
                <div className="easa-card p-5 text-sm text-[var(--easa-color-text-muted)]">
                  No manual sections matched the current query and filters.
                </div>
              ) : (
                payload.results.manuals.map((result) => (
                  <ManualResultCard key={result.id} result={result} />
                ))
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Approved update matches</h2>
                <span className="text-sm text-[var(--easa-color-text-muted)]">
                  {payload.results.approvedUpdates.length} result{payload.results.approvedUpdates.length !== 1 ? "s" : ""}
                </span>
              </div>

              {payload.results.approvedUpdates.length === 0 ? (
                <div className="easa-card p-5 text-sm text-[var(--easa-color-text-muted)]">
                  No approved updates matched the current query and filters.
                </div>
              ) : (
                payload.results.approvedUpdates.map((result) => (
                  <ApprovedUpdateCard key={result.id} result={result} />
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
