"use client";

import { Bot } from "lucide-react";
import { useEffect, useRef } from "react";
import DraftPreviewCard from "./DraftPreviewCard";
import FindingCard from "./FindingCard";
import SourceLinks from "./SourceLinks";
import { useCoworker } from "./CoworkerProvider";

export default function MessageTimeline() {
  const { messages, loading } = useCoworker();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!messages.length && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Bot size={32} className="text-[var(--easa-color-brand-primary)]" strokeWidth={1.5} />
        <p className="text-sm font-semibold">Focused compliance coworker</p>
        <p className="text-xs text-[var(--easa-color-text-muted)]">Ask about manuals, pending findings, or a draft update. Changes always go to review first.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((message) => (
        <div key={message.id} data-role={message.role} className={message.role === "user" ? "ml-8 rounded-xl bg-[var(--easa-color-brand-primary)] p-3 text-sm text-white" : "mr-4 rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3 text-sm text-[var(--easa-color-text-primary)]"}>
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.role === "assistant" ? (
            <>
              {message.cards.map((card, index) => card.type === "finding"
                ? <FindingCard key={`${card.findingId}-${index}`} card={card} />
                : <DraftPreviewCard key={`${card.findingId}-${card.sectionId}-${index}`} card={card} sourceMessageId={message.id} />)}
              <SourceLinks citations={message.citations} />
            </>
          ) : null}
        </div>
      ))}
      {loading ? <p className="text-xs text-[var(--easa-color-text-muted)]">Working...</p> : null}
      <div ref={endRef} />
    </div>
  );
}
