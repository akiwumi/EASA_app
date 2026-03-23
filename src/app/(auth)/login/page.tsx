"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/** Dummy admin from scripts/create-admin-user.mjs: use login "admin" (→ admin@easa.local). */
const DUMMY_ADMIN_EMAIL = "admin@easa.local";

function toSignInEmail(input: string) {
  const t = input.trim();
  if (!t) return t;
  if (t.includes("@")) return t;
  if (t.toLowerCase() === "admin") return DUMMY_ADMIN_EMAIL;
  return t;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

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
      email: toSignInEmail(email),
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("idle");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[900px] items-center justify-center p-6">
        <div className="w-full max-w-[420px] space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--easa-color-brand-primary)] text-sm font-semibold text-white">
              EA
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Welcome back</h1>
            <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
              Sign in to review regulation updates and manage flight books.
            </p>
          </div>

          <div className="easa-card p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-xs text-[var(--easa-color-text-muted)]">
                Email or username
                <input
                  className="mt-2 w-full rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)] outline-none"
                  autoComplete="username"
                  placeholder="admin or name@school.org"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="block text-xs text-[var(--easa-color-text-muted)]">
                Password
                <input
                  className="mt-2 w-full rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)] outline-none"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button
                className="easa-btn primary w-full"
                type="submit"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Signing in..." : "Login"}
              </button>
            </form>
            {message ? (
              <p className="mt-3 text-xs text-[var(--easa-color-text-muted)]">
                {message}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
              <span>Forgot password?</span>
              <Link className="text-[var(--easa-color-accent-blue)]" href="/">
                Back to landing
              </Link>
            </div>
          </div>

          <div className="text-center text-xs text-[var(--easa-color-text-muted)]">
            New here? Ask your admin for an invite.
          </div>
        </div>
      </div>
    </div>
  );
}
