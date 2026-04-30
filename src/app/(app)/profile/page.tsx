"use client";

import { useEffect, useState } from "react";
import { User, Bell, Lock, CheckCircle } from "lucide-react";

interface Profile {
  id: string;
  display_name: string | null;
  notification_email: boolean;
  notification_inapp: boolean;
  notification_digest: string;
}

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Display name
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  // Notification prefs
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifInapp, setNotifInapp] = useState(true);
  const [notifDigest, setNotifDigest] = useState("immediate");
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((json) => {
        setProfile(json.profile);
        setEmail(json.email ?? null);
        setDisplayName(json.profile.display_name ?? "");
        setNotifEmail(json.profile.notification_email ?? true);
        setNotifInapp(json.profile.notification_inapp ?? true);
        setNotifDigest(json.profile.notification_digest ?? "immediate");
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function saveDisplayName() {
    setSavingName(true);
    setNameMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNameMsg(json.error ?? "Failed to save");
    } else {
      setNameMsg("Saved.");
      setTimeout(() => setNameMsg(null), 2000);
    }
    setSavingName(false);
  }

  async function saveNotifPrefs() {
    setSavingNotif(true);
    setNotifMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notification_email: notifEmail,
        notification_inapp: notifInapp,
        notification_digest: notifDigest,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotifMsg(json.error ?? "Failed to save");
    } else {
      setNotifMsg("Preferences saved.");
      setTimeout(() => setNotifMsg(null), 2000);
    }
    setSavingNotif(false);
  }

  async function changePassword() {
    setPasswordError(null);
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      setPasswordError(json.error ?? "Failed to change password");
    } else {
      setPasswordMsg("Password changed successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  }

  if (loading) {
    return (
      <div className="easa-card p-8">
        <p className="text-sm text-[var(--easa-color-text-muted)]">Loading profile…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="easa-card p-8">
        <p className="text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="easa-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--easa-color-surface-2)]">
            <User size={20} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Your profile</h1>
            <p className="mt-0.5 text-sm text-[var(--easa-color-text-muted)]">{email}</p>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="easa-card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <User size={16} strokeWidth={1.75} />
          Display name
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-[var(--easa-color-text-muted)]">
              Name shown to other org members
            </label>
            <input
              className="easa-input w-full"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <button
            type="button"
            className="easa-btn primary text-sm"
            disabled={savingName}
            onClick={saveDisplayName}
          >
            {savingName ? "Saving…" : "Save"}
          </button>
        </div>
        {nameMsg && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--easa-color-accent-green)]">
            <CheckCircle size={13} strokeWidth={2} />
            {nameMsg}
          </p>
        )}
      </div>

      {/* Notification preferences */}
      <div className="easa-card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Bell size={16} strokeWidth={1.75} />
          Notification preferences
        </h2>

        <div className="space-y-3">
          {/* Email toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={notifEmail}
                onChange={(e) => setNotifEmail(e.target.checked)}
              />
              <div
                className={`h-5 w-9 rounded-full transition ${notifEmail ? "bg-[var(--easa-color-brand-primary)]" : "bg-[var(--easa-color-surface-3)]"}`}
              />
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${notifEmail ? "left-[calc(100%-1.125rem)]" : "left-0.5"}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">Receive email when changes need review or are approved</p>
            </div>
          </label>

          {/* In-app toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={notifInapp}
                onChange={(e) => setNotifInapp(e.target.checked)}
              />
              <div
                className={`h-5 w-9 rounded-full transition ${notifInapp ? "bg-[var(--easa-color-brand-primary)]" : "bg-[var(--easa-color-surface-3)]"}`}
              />
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${notifInapp ? "left-[calc(100%-1.125rem)]" : "left-0.5"}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium">In-app notifications</p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">Show the bell badge in the navigation</p>
            </div>
          </label>

          {/* Digest frequency */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--easa-color-text-muted)]">
              Email frequency
            </label>
            <select
              className="easa-input text-sm"
              value={notifDigest}
              onChange={(e) => setNotifDigest(e.target.value)}
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily digest (07:00 UTC)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="easa-btn primary text-sm"
            disabled={savingNotif}
            onClick={saveNotifPrefs}
          >
            {savingNotif ? "Saving…" : "Save preferences"}
          </button>
          {notifMsg && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--easa-color-accent-green)]">
              <CheckCircle size={13} strokeWidth={2} />
              {notifMsg}
            </span>
          )}
        </div>
      </div>

      {/* Password change */}
      <div className="easa-card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Lock size={16} strokeWidth={1.75} />
          Change password
        </h2>

        <div className="max-w-sm space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--easa-color-text-muted)]">
              New password
            </label>
            <input
              className="easa-input w-full"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--easa-color-text-muted)]">
              Confirm new password
            </label>
            <input
              className="easa-input w-full"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>
        </div>

        {passwordError && (
          <p className="text-xs text-[var(--easa-color-accent-pink)]">{passwordError}</p>
        )}
        {passwordMsg && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--easa-color-accent-green)]">
            <CheckCircle size={13} strokeWidth={2} />
            {passwordMsg}
          </p>
        )}

        <button
          type="button"
          className="easa-btn secondary text-sm"
          disabled={savingPassword || !newPassword}
          onClick={changePassword}
        >
          {savingPassword ? "Changing…" : "Change password"}
        </button>
      </div>

      {/* Organisation membership */}
      <div className="easa-card p-6">
        <h2 className="mb-3 text-base font-semibold">Organisation</h2>
        <p className="text-sm text-[var(--easa-color-text-secondary)]">
          {profile?.id ? "South Sweden Aviation" : "—"}
        </p>
        <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
          Contact your administrator to change your role or organisation membership.
        </p>
      </div>
    </div>
  );
}
