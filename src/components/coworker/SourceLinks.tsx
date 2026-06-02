import type { CoworkerCitation } from "@/lib/coworker/response-types";

export default function SourceLinks({ citations }: { citations: CoworkerCitation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 border-t border-[var(--easa-color-border)] pt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--easa-color-text-muted)]">Sources</p>
      <ul className="mt-1 space-y-1">
        {citations.map((citation, index) => (
          <li key={`${citation.href}-${index}`}>
            <a href={citation.href} className="text-xs font-medium text-[var(--easa-color-brand-primary)] hover:underline">
              {citation.label}
            </a>
            {citation.excerpt ? <p className="mt-0.5 text-[11px] text-[var(--easa-color-text-muted)]">{citation.excerpt}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
