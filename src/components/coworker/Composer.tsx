"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useCoworker } from "./CoworkerProvider";

export default function Composer() {
  const { sendMessage, loading } = useCoworker();
  const [content, setContent] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = content.trim();
    if (!next || loading) return;
    setContent("");
    void sendMessage(next);
  }
  return (
    <form onSubmit={submit} className="flex shrink-0 gap-2 border-t border-[var(--easa-color-border)] bg-white p-3">
      <label className="sr-only" htmlFor="coworker-message">Message compliance coworker</label>
      <textarea id="coworker-message" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Ask about manuals or findings..." rows={2} className="easa-input min-h-[52px] flex-1 resize-none" />
      <button type="submit" disabled={loading || !content.trim()} aria-label="Send message" className="easa-btn primary self-end">
        <Send size={15} />
      </button>
    </form>
  );
}
