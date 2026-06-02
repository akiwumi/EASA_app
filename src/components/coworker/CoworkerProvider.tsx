"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CoworkerCard, CoworkerCitation, CoworkerIntent } from "@/lib/coworker/response-types";

export type CoworkerConversation = {
  id: string;
  title: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type CoworkerMessage = {
  id: string;
  role: "user" | "assistant";
  intent?: CoworkerIntent | null;
  content: string;
  citations: CoworkerCitation[];
  cards: CoworkerCard[];
  createdAt: string;
};

type ReviewItemResult = {
  id: string;
  alreadyQueued: boolean;
};

type CoworkerContextValue = {
  open: boolean;
  conversations: CoworkerConversation[];
  archivedConversations: CoworkerConversation[];
  activeConversationId: string | null;
  messages: CoworkerMessage[];
  loading: boolean;
  error: string | null;
  openCoworker: () => void;
  closeCoworker: () => void;
  setActiveConversationId: (id: string) => void;
  createConversation: () => Promise<string | null>;
  archiveConversation: (id: string) => Promise<void>;
  restoreConversation: (id: string) => Promise<void>;
  deleteArchivedConversation: (id: string) => Promise<void>;
  refreshArchivedConversations: () => Promise<void>;
  sendMessage: (content: string, findingId?: string) => Promise<void>;
  createReviewItem: (findingId: string, sourceMessageId: string) => Promise<ReviewItemResult>;
};

const CoworkerContext = createContext<CoworkerContextValue | null>(null);
const ACTIVE_CONVERSATION_STORAGE_KEY = "henry-active-conversation-id";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeConversation(value: unknown): CoworkerConversation | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    title: typeof value.title === "string" ? value.title : "New conversation",
    updatedAt: typeof value.updated_at === "string" ? value.updated_at : new Date().toISOString(),
    archivedAt: typeof value.archived_at === "string" ? value.archived_at : null,
  };
}

function normalizeMessage(value: unknown): CoworkerMessage | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.content !== "string") {
    return null;
  }
  const metadata = isRecord(value.metadata) ? value.metadata : {};
  const citations = Array.isArray(value.citations)
    ? value.citations
    : Array.isArray(metadata.citations) ? metadata.citations : [];
  const cards = Array.isArray(value.cards)
    ? value.cards
    : Array.isArray(metadata.cards) ? metadata.cards : [];
  return {
    id: value.id,
    role: value.role === "user" ? "user" : "assistant",
    intent: typeof value.intent === "string" ? value.intent as CoworkerIntent : null,
    content: value.content,
    citations: citations as CoworkerCitation[],
    cards: cards as CoworkerCard[],
    createdAt: typeof value.created_at === "string" ? value.created_at : new Date().toISOString(),
  };
}

async function readJson(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(isRecord(json) && typeof json.error === "string" ? json.error : "Request failed");
  }
  return json as Record<string, unknown>;
}

export function CoworkerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<CoworkerConversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<CoworkerConversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoworkerMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestLocked = useRef(false);
  const activeConversationIdRef = useRef<string | null>(null);
  const activeConversationStorageHydrated = useRef(false);
  const conversationLoadSequence = useRef(0);
  const messageLoadSequence = useRef(0);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    if (!activeConversationStorageHydrated.current) return;
    if (activeConversationId) {
      window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, activeConversationId);
    } else {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    }
  }, [activeConversationId]);

  const loadConversations = useCallback(async () => {
    const sequence = ++conversationLoadSequence.current;
    const json = await readJson(await fetch("/api/coworker/conversations"));
    if (sequence !== conversationLoadSequence.current) return;
    const next = Array.isArray(json.conversations)
      ? json.conversations.map(normalizeConversation).filter(Boolean) as CoworkerConversation[]
      : [];
    setConversations(next);
    setActiveConversationIdState((current) => {
      const saved = window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
      const active = [current, saved].find((id) => id && next.some((conversation) => conversation.id === id))
        ?? next[0]?.id
        ?? null;
      activeConversationIdRef.current = active;
      activeConversationStorageHydrated.current = true;
      if (active) {
        window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, active);
      } else {
        window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
      }
      return active;
    });
  }, []);

  const refreshArchivedConversations = useCallback(async () => {
    const json = await readJson(await fetch("/api/coworker/conversations/archive"));
    const next = Array.isArray(json.conversations)
      ? json.conversations.map(normalizeConversation).filter(Boolean) as CoworkerConversation[]
      : [];
    setArchivedConversations(next);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const json = await readJson(await fetch(`/api/coworker/conversations/${conversationId}/messages`));
    return Array.isArray(json.messages)
      ? json.messages.map(normalizeMessage).filter(Boolean) as CoworkerMessage[]
      : [];
  }, []);

  const setActiveConversationId = useCallback((id: string) => {
    activeConversationIdRef.current = id;
    setActiveConversationIdState(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadConversations().catch(() => setError("Unable to load conversations."));
  }, [loadConversations, open]);

  useEffect(() => {
    if (!open || !activeConversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const sequence = ++messageLoadSequence.current;
    setLoading(true);
    loadMessages(activeConversationId)
      .then((next) => {
        if (cancelled || sequence !== messageLoadSequence.current) return;
        setMessages(next);
      })
      .catch(() => {
        if (!cancelled && sequence === messageLoadSequence.current) setError("Unable to load messages.");
      })
      .finally(() => {
        if (!cancelled && sequence === messageLoadSequence.current) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeConversationId, loadMessages, open]);

  const createConversation = useCallback(async () => {
    if (requestLocked.current) return null;
    requestLocked.current = true;
    setLoading(true);
    setError(null);
    try {
      const json = await readJson(await fetch("/api/coworker/conversations", { method: "POST" }));
      const conversation = normalizeConversation(json.conversation);
      if (!conversation) throw new Error("Invalid conversation response");
      setConversations((current) => [conversation, ...current]);
      activeConversationIdRef.current = conversation.id;
      setActiveConversationIdState(conversation.id);
      setMessages([]);
      return conversation.id;
    } catch {
      setError("Unable to create conversation.");
      return null;
    } finally {
      requestLocked.current = false;
      setLoading(false);
    }
  }, []);

  const archiveConversation = useCallback(async (id: string) => {
    if (requestLocked.current) return;
    requestLocked.current = true;
    setLoading(true);
    setError(null);
    try {
      await readJson(await fetch(`/api/coworker/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      }));
      if (activeConversationIdRef.current === id) {
        activeConversationIdRef.current = null;
        messageLoadSequence.current += 1;
        setActiveConversationIdState(null);
        setMessages([]);
      }
      await Promise.all([loadConversations(), refreshArchivedConversations()]);
    } catch {
      setError("Unable to archive conversation.");
    } finally {
      requestLocked.current = false;
      setLoading(false);
    }
  }, [loadConversations, refreshArchivedConversations]);

  const restoreConversation = useCallback(async (id: string) => {
    if (requestLocked.current) return;
    requestLocked.current = true;
    setLoading(true);
    setError(null);
    try {
      await readJson(await fetch(`/api/coworker/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      }));
      await Promise.all([loadConversations(), refreshArchivedConversations()]);
    } catch {
      setError("Unable to restore conversation.");
    } finally {
      requestLocked.current = false;
      setLoading(false);
    }
  }, [loadConversations, refreshArchivedConversations]);

  const deleteArchivedConversation = useCallback(async (id: string) => {
    if (requestLocked.current) return;
    requestLocked.current = true;
    setLoading(true);
    setError(null);
    try {
      await readJson(await fetch(`/api/coworker/conversations/${id}`, { method: "DELETE" }));
      setArchivedConversations((current) => current.filter((conversation) => conversation.id !== id));
    } catch {
      setError("Unable to delete conversation.");
    } finally {
      requestLocked.current = false;
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, findingId?: string) => {
    const trimmed = content.trim();
    if (!trimmed || requestLocked.current) return;
    requestLocked.current = true;
    setLoading(true);
    setError(null);
    try {
      let conversationId = activeConversationIdRef.current;
      if (!conversationId) {
        const json = await readJson(await fetch("/api/coworker/conversations", { method: "POST" }));
        const conversation = normalizeConversation(json.conversation);
        if (!conversation) throw new Error("Invalid conversation response");
        conversationId = conversation.id;
        activeConversationIdRef.current = conversation.id;
        setConversations((current) => [conversation, ...current]);
        setActiveConversationIdState(conversation.id);
        setMessages([]);
      }
      if (!conversationId) return;
      await readJson(await fetch(`/api/coworker/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, ...(findingId ? { findingId } : {}) }),
      }));
      const nextMessages = await loadMessages(conversationId);
      if (activeConversationIdRef.current === conversationId) {
        messageLoadSequence.current += 1;
        setMessages(nextMessages);
      }
      await loadConversations();
    } catch {
      setError("Unable to send message.");
    } finally {
      requestLocked.current = false;
      setLoading(false);
    }
  }, [loadConversations, loadMessages]);

  const createReviewItem = useCallback(async (findingId: string, sourceMessageId: string) => {
    if (!activeConversationId) throw new Error("No active conversation");
    const json = await readJson(await fetch("/api/coworker/actions/create-review-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingId, conversationId: activeConversationId, sourceMessageId }),
    }));
    if (typeof json.id !== "string") throw new Error("Invalid review item response");
    return { id: json.id, alreadyQueued: json.alreadyQueued === true };
  }, [activeConversationId]);

  const value = useMemo<CoworkerContextValue>(() => ({
    open,
    conversations,
    archivedConversations,
    activeConversationId,
    messages,
    loading,
    error,
    openCoworker: () => setOpen(true),
    closeCoworker: () => setOpen(false),
    setActiveConversationId,
    createConversation,
    archiveConversation,
    restoreConversation,
    deleteArchivedConversation,
    refreshArchivedConversations,
    sendMessage,
    createReviewItem,
  }), [activeConversationId, archiveConversation, archivedConversations, conversations, createConversation, createReviewItem, deleteArchivedConversation, error, loading, messages, open, refreshArchivedConversations, restoreConversation, sendMessage, setActiveConversationId]);

  return <CoworkerContext.Provider value={value}>{children}</CoworkerContext.Provider>;
}

export function useCoworker() {
  const context = useContext(CoworkerContext);
  if (!context) throw new Error("useCoworker must be used inside CoworkerProvider");
  return context;
}
