"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not configured.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    const nextPath = next && next.startsWith("/") ? next : "/dashboard";
    window.location.assign(nextPath);
  };

  return (
    <div className="easa-shell flex min-h-screen items-center justify-center py-8">
      <section className="easa-card-glass w-full max-w-xl p-6 md:p-8">
          <span className="easa-eyebrow">Sign in</span>
          <h2 className="mt-4 text-3xl font-semibold text-[var(--easa-color-text-primary)]">
            Access your organisation workspace
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--easa-color-text-muted)]">
            Sign in with your organisation email address and password.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]">
              Email
              <input
                className="easa-input mt-2 w-full"
                autoComplete="username"
                placeholder="name@school.org"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]">
              Password
              <input
                className="easa-input mt-2 w-full"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="easa-btn primary w-full justify-center" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Signing in..." : "Login"}
            </button>
          </form>

          {message ? (
            <p className="mt-4 text-sm text-[var(--easa-color-accent-orange)]">{message}</p>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3 text-sm text-[var(--easa-color-text-muted)]">
            <span>Forgot password?</span>
            <Link className="font-medium text-[var(--easa-color-brand-primary)]" href="/register">
              Register school
            </Link>
          </div>

          <div className="mt-8 rounded-[22px] bg-[var(--easa-color-surface-2)] p-4 text-sm leading-7 text-[var(--easa-color-text-secondary)]">
            New here? Register a new flight school workspace or ask your admin for an invite.
          </div>
        </section>
    </div>
  );
}
