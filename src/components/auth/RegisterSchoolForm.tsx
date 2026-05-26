"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function RegisterSchoolForm({
  selectedPlan,
}: {
  selectedPlan?: string;
}) {
  const [schoolName, setSchoolName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    const registerResponse = await fetch("/api/auth/register-school", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolName,
        adminName,
        email,
        password,
      }),
    });

    const registerPayload = await registerResponse.json();
    if (!registerResponse.ok) {
      setStatus("error");
      setMessage(registerPayload.error ?? "Registration failed.");
      return;
    }

    setStatus("success");
    setMessage(
      `Verification email sent to ${email.trim().toLowerCase()}. Open it to reach the welcome page and choose a Stripe subscription.`,
    );
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="easa-shell flex min-h-screen min-w-0 items-center justify-center py-6 sm:py-8">
      <section className="easa-card-glass min-w-0 w-full max-w-2xl overflow-hidden p-5 sm:p-6 md:p-8">
        <span className="easa-eyebrow">New flight school</span>
        <h1 className="mt-4 text-2xl font-semibold text-[var(--easa-color-text-primary)] sm:text-3xl">
          Register your school workspace
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--easa-color-text-muted)]">
          Create the first admin account for your flight school. We will email a verification link before checkout.
        </p>
        {selectedPlan ? (
          <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
            Selected plan: {selectedPlan}
          </p>
        ) : null}

        <form className="mt-6 grid min-w-0 gap-4 sm:mt-8 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="easa-form-label md:col-span-2">
            Flight school name
            <input
              className="easa-input mt-2 w-full"
              placeholder="Nordic Flight Academy"
              type="text"
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              required
            />
          </label>
          <label className="easa-form-label">
            Admin name
            <input
              className="easa-input mt-2 w-full"
              placeholder="Alex Johnson"
              type="text"
              value={adminName}
              onChange={(event) => setAdminName(event.target.value)}
              required
            />
          </label>
          <label className="easa-form-label">
            Work email
            <input
              className="easa-input mt-2 w-full"
              autoComplete="email"
              placeholder="admin@school.org"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="easa-form-label">
            Password
            <div className="relative mt-2">
              <input
                className="easa-input w-full pr-12"
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
          <label className="easa-form-label">
            Confirm password
            <input
              className="easa-input mt-2 w-full"
              autoComplete="new-password"
              placeholder="Repeat password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          <div className="md:col-span-2">
            <button className="easa-btn primary w-full justify-center" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Creating workspace..." : "Create school workspace"}
            </button>
          </div>
        </form>

        {message ? (
          <p
            className={`mt-4 text-sm ${
              status === "success"
                ? "text-[var(--easa-color-brand-primary)]"
                : "text-[var(--easa-color-accent-orange)]"
            }`}
          >
            {message}
          </p>
        ) : null}

        <div className="mt-6 flex min-w-0 flex-col gap-2 text-sm text-[var(--easa-color-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span>Already have a school workspace?</span>
          <Link className="font-medium text-[var(--easa-color-brand-primary)]" href="/">
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
