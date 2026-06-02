"use client";

import Link from "next/link";
import { Archive, MessageSquarePlus } from "lucide-react";
import { useCoworker } from "./CoworkerProvider";

export default function ConversationList() {
  const { conversations, activeConversationId, setActiveConversationId, createConversation, archiveConversation, loading } = useCoworker();
  return (
    <div className="border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3">
      <button type="button" disabled={loading} onClick={() => void createConversation()} className="easa-btn secondary flex w-full items-center justify-center gap-2">
        <MessageSquarePlus size={15} /> New chat
      </button>
      <Link href="/coworker/archive" className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--easa-color-brand-primary)] hover:underline">
        <Archive size={13} /> Henry archive
      </Link>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--easa-color-text-muted)]">Active conversations</p>
      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <div key={conversation.id} data-conversation-id={conversation.id} className={`flex items-center rounded-lg ${activeConversationId === conversation.id ? "bg-white" : "hover:bg-white"}`}>
            <button type="button" onClick={() => setActiveConversationId(conversation.id)} className={`min-w-0 flex-1 px-3 py-2 text-left text-xs ${activeConversationId === conversation.id ? "font-semibold text-[var(--easa-color-brand-primary)]" : "text-[var(--easa-color-text-secondary)]"}`}>
              {conversation.title}
            </button>
            <button type="button" disabled={loading} onClick={(event) => { event.stopPropagation(); void archiveConversation(conversation.id); }} aria-label={`Archive ${conversation.title}`} title="Archive conversation" className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]">
              <Archive size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
