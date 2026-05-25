"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    const normalizedEmail = email.trim().toLowerCase() === "admin"
      ? "admin@easa.local"
      : email.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    let defaultPath = "/updates";
    try {
      const orgsResponse = await fetch("/api/orgs", { cache: "no-store" });
      if (orgsResponse.ok) {
        const payload = (await orgsResponse.json()) as {
          memberships?: Array<{ role?: string | null }>;
        };
        const memberships = Array.isArray(payload.memberships) ? payload.memberships : [];
        const isAdmin = memberships.some((membership) => membership.role === "admin");
        defaultPath = isAdmin ? "/dashboard" : "/updates";
      }
    } catch {
      // Fallback to non-admin landing if org role lookup fails.
    }

    const next = new URLSearchParams(window.location.search).get("next");
    const nextPath = next && next.startsWith("/") ? next : defaultPath;
    window.location.assign(nextPath);
  };

  return (
    <div className="easa-shell flex min-h-screen min-w-0 items-center justify-center py-6 sm:py-8">
      <section className="easa-card-glass min-w-0 w-full max-w-xl overflow-hidden p-5 sm:p-6 md:p-8">
          <span className="easa-eyebrow">Sign in</span>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--easa-color-text-primary)] sm:text-3xl">
            Access your organisation workspace
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--easa-color-text-muted)]">
            Sign in with your organisation email address and password.
          </p>

          <form className="mt-6 min-w-0 space-y-4 sm:mt-8" onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]">
              Email
              <input
                className="easa-input mt-2 w-full"
                autoComplete="username"
                placeholder="admin or name@school.org"
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]">
              Password
              <div className="relative mt-2">
                <input
                  className="easa-input w-full pr-12"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--easa-color-text-muted)]"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button className="easa-btn primary w-full justify-center" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Signing in..." : "Login"}
            </button>
          </form>

          {message ? (
            <p className="mt-4 text-sm text-[var(--easa-color-accent-orange)]">{message}</p>
          ) : null}

          <div className="mt-6 flex min-w-0 flex-col gap-2 text-sm text-[var(--easa-color-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
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
