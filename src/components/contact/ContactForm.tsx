"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Send, XCircle } from "lucide-react";

type Status = "idle" | "sending" | "success" | "error";

const SUBJECT_OPTIONS = [
  "General enquiry",
  "Demo request",
  "Technical support",
  "Billing",
  "Partnership",
] as const;

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fields, setFields] = useState({
    name: "",
    email: "",
    subject: SUBJECT_OPTIONS[0],
    message: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setErrorMsg(json.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setFields({ name: "", email: "", subject: SUBJECT_OPTIONS[0], message: "" });
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-green)_12%,transparent)]">
          <CheckCircle size={28} strokeWidth={1.75} className="text-[var(--easa-color-accent-green)]" />
        </div>
        <div>
          <p className="text-base font-semibold text-[var(--easa-color-text-primary)]">Message sent!</p>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            We typically respond within one business day.
          </p>
        </div>
        <button
          type="button"
          className="easa-btn secondary text-sm"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--easa-color-text-muted)]">
            Name
          </span>
          <input
            name="name"
            type="text"
            required
            value={fields.name}
            onChange={handleChange}
            placeholder="Your name"
            className="easa-input mt-2 w-full"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--easa-color-text-muted)]">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            value={fields.email}
            onChange={handleChange}
            placeholder="you@school.com"
            className="easa-input mt-2 w-full"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--easa-color-text-muted)]">
          Subject
        </span>
        <select
          name="subject"
          value={fields.subject}
          onChange={handleChange}
          className="easa-input mt-2 w-full"
        >
          {SUBJECT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--easa-color-text-muted)]">
          Message
        </span>
        <textarea
          name="message"
          required
          rows={5}
          value={fields.message}
          onChange={handleChange}
          placeholder="Tell us how we can help..."
          className="easa-input mt-2 w-full resize-none"
        />
      </label>

      {status === "error" && (
        <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--easa-color-accent-pink)_30%,transparent)] bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_8%,transparent)] px-4 py-3 text-sm text-[var(--easa-color-accent-pink)]">
          <XCircle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="easa-btn primary flex w-full items-center justify-center gap-2 text-sm"
      >
        {status === "sending" ? (
          <>
            <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send size={15} strokeWidth={1.75} />
            Send message
          </>
        )}
      </button>
    </form>
  );
}
