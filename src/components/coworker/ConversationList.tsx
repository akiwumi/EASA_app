"use client";

import { MessageSquarePlus } from "lucide-react";
import { useCoworker } from "./CoworkerProvider";

export default function ConversationList() {
  const { conversations, activeConversationId, setActiveConversationId, createConversation, loading } = useCoworker();
  return (
    <div className="border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3">
      <button type="button" disabled={loading} onClick={() => void createConversation()} className="easa-btn secondary flex w-full items-center justify-center gap-2">
        <MessageSquarePlus size={15} /> New chat
      </button>
      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <button key={conversation.id} type="button" onClick={() => setActiveConversationId(conversation.id)} className={`w-full rounded-lg px-3 py-2 text-left text-xs ${activeConversationId === conversation.id ? "bg-white font-semibold text-[var(--easa-color-brand-primary)]" : "text-[var(--easa-color-text-secondary)] hover:bg-white"}`}>
            {conversation.title}
          </button>
        ))}
      </div>
    </div>
  );
}
