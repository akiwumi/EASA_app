"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle, Lock, Mail, ShieldCheck, User, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { UserProfileSummary } from "@/lib/types/domain";

type ProfileResponse = {
  email: string | null;
  emailConfirmedAt: string | null;
  role: string | null;
  organizationName: string | null;
  profile: UserProfileSummary;
};

function roleLabel(role: string | null) {
  if (role === "admin") return "Admin";
  if (role === "compliance_manager") return "Compliance manager";
  if (role === "editor") return "Editor";
  if (role === "instructor") return "Instructor";
  if (role === "student") return "Student";
  if (role === "viewer") return "Viewer";
  return "Unassigned";
}

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [emailConfirmedAt, setEmailConfirmedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifInapp, setNotifInapp] = useState(true);
  const [notifDigest, setNotifDigest] = useState("immediate");
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [emailActionMsg, setEmailActionMsg] = useState<string | null>(null);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((json: ProfileResponse) => {
        setProfile(json.profile);
        setEmail(json.email ?? null);
        setRole(json.role ?? null);
        setOrganizationName(json.organizationName ?? null);
        setEmailConfirmedAt(json.emailConfirmedAt ?? null);
        setDisplayName(json.profile.display_name ?? "");
        setAvatarUrl(json.profile.avatar_url ?? "");
        setPhone(json.profile.phone ?? "");
        setPersonalNotes(json.profile.personal_notes ?? "");
        setNotifEmail(json.profile.notification_email ?? true);
        setNotifInapp(json.profile.notification_inapp ?? true);
        setNotifDigest(json.profile.notification_digest ?? "immediate");
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const avatarPreview = useMemo(() => avatarUrl.trim(), [avatarUrl]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName,
        avatar_url: avatarUrl,
        phone: phone,
        personal_notes: personalNotes,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setProfileMsg(json.error ?? "Failed to save");
    } else {
      setProfileMsg("Profile saved.");
    }
    setSavingProfile(false);
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

  async function sendVerificationEmail() {
    if (!email) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setEmailActionMsg("Supabase is not configured.");
      return;
    }

    setSendingVerify(true);
    setEmailActionMsg(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
      },
    });

    setSendingVerify(false);
    if (resendError) {
      setEmailActionMsg(resendError.message);
      return;
    }
    setEmailActionMsg("Verification email sent.");
  }

  async function sendPasswordResetEmail() {
    if (!email) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setEmailActionMsg("Supabase is not configured.");
      return;
    }

    setSendingReset(true);
    setEmailActionMsg(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    });
    setSendingReset(false);
    if (resetError) {
      setEmailActionMsg(resetError.message);
      return;
    }
    setEmailActionMsg("Password reset email sent.");
  }

  if (loading) {
    return (
      <div className="easa-card p-8">
        <p className="text-sm text-[var(--easa-color-text-muted)]">Loading profile…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="easa-card p-8">
        <p className="text-sm text-[var(--easa-color-accent-pink)]">{error ?? "Failed to load profile."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="easa-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[var(--easa-color-surface-2)]">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={displayName || email || "Profile"} className="h-full w-full object-cover" src={avatarPreview} />
            ) : (
              <UserRound size={28} className="text-[var(--easa-color-text-muted)]" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">Your profile</h1>
            <p className="mt-0.5 text-sm text-[var(--easa-color-text-muted)]">{email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="easa-badge is-blue">{roleLabel(role)}</span>
              <span className={emailConfirmedAt ? "easa-badge is-green" : "easa-badge"}>
                {emailConfirmedAt ? "Email verified" : "Email verification pending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="easa-card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <User size={16} strokeWidth={1.75} />
          Personal profile
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">Display name</span>
            <input className="easa-input w-full" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">Profile picture URL</span>
            <input className="easa-input w-full" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">Phone</span>
            <input className="easa-input w-full" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+46 …" />
          </label>
          <div className="rounded-[18px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 text-sm text-[var(--easa-color-text-muted)]">
            <p className="font-medium text-[var(--easa-color-text-primary)]">Organisation</p>
            <p className="mt-1">{organizationName ?? "No organisation assigned"}</p>
            <p className="mt-1">Role: {roleLabel(role)}</p>
          </div>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="text-xs text-[var(--easa-color-text-muted)]">Personal notes</span>
            <textarea className="easa-input min-h-28 w-full" value={personalNotes} onChange={(e) => setPersonalNotes(e.target.value)} placeholder="Training notes, role context, internal reminders…" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="easa-btn primary text-sm" disabled={savingProfile} onClick={saveProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
          {profileMsg ? (
            <p className="flex items-center gap-1.5 text-xs text-[var(--easa-color-accent-green)]">
              <CheckCircle size={13} strokeWidth={2} />
              {profileMsg}
            </p>
          ) : null}
        </div>
      </div>

      <div className="easa-card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Bell size={16} strokeWidth={1.75} />
          Notification preferences
        </h2>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} />
            <div>
              <p className="text-sm font-medium">Email notifications</p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">Receive email when changes need review or are approved.</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={notifInapp} onChange={(e) => setNotifInapp(e.target.checked)} />
            <div>
              <p className="text-sm font-medium">In-app notifications</p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">Show notifications in the workspace bell menu.</p>
            </div>
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--easa-color-text-muted)]">Email frequency</label>
            <select className="easa-input text-sm" value={notifDigest} onChange={(e) => setNotifDigest(e.target.value)}>
              <option value="immediate">Immediate</option>
              <option value="partial">Priority digest only</option>
              <option value="daily">Daily digest (07:00 UTC)</option>
              <option value="weekly">Weekly digest (Mondays, 07:00 UTC)</option>
            </select>
            <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
              Priority digest sends only approval, rejection, revision, and rollback activity. Weekly digest batches the last 7 days each Monday.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="easa-btn primary text-sm" disabled={savingNotif} onClick={saveNotifPrefs}>
            {savingNotif ? "Saving…" : "Save preferences"}
          </button>
          {notifMsg ? (
            <span className="flex items-center gap-1.5 text-xs text-[var(--easa-color-accent-green)]">
              <CheckCircle size={13} strokeWidth={2} />
              {notifMsg}
            </span>
          ) : null}
        </div>
      </div>

      <div className="easa-card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Mail size={16} strokeWidth={1.75} />
          Email security
        </h2>
        <p className="text-sm text-[var(--easa-color-text-muted)]">
          Resend account verification or send yourself a password reset email.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="easa-btn secondary text-sm" disabled={sendingVerify || Boolean(emailConfirmedAt)} onClick={sendVerificationEmail}>
            {sendingVerify ? "Sending…" : emailConfirmedAt ? "Email already verified" : "Send verification email"}
          </button>
          <button type="button" className="easa-btn secondary text-sm" disabled={sendingReset} onClick={sendPasswordResetEmail}>
            {sendingReset ? "Sending…" : "Send password reset email"}
          </button>
        </div>
        {emailActionMsg ? (
          <p className="text-xs text-[var(--easa-color-text-muted)]">{emailActionMsg}</p>
        ) : null}
      </div>

      <div className="easa-card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Lock size={16} strokeWidth={1.75} />
          Change password
        </h2>
        <div className="max-w-sm space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--easa-color-text-muted)]">New password</label>
            <input className="easa-input w-full" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--easa-color-text-muted)]">Confirm new password</label>
            <input className="easa-input w-full" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
          </div>
        </div>
        {passwordError ? <p className="text-xs text-[var(--easa-color-accent-pink)]">{passwordError}</p> : null}
        {passwordMsg ? (
          <p className="flex items-center gap-1.5 text-xs text-[var(--easa-color-accent-green)]">
            <CheckCircle size={13} strokeWidth={2} />
            {passwordMsg}
          </p>
        ) : null}
        <button type="button" className="easa-btn secondary text-sm" disabled={savingPassword || !newPassword} onClick={changePassword}>
          {savingPassword ? "Changing…" : "Change password"}
        </button>
      </div>

      <div className="easa-card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <ShieldCheck size={16} strokeWidth={1.75} />
          Access
        </h2>
        <p className="text-sm text-[var(--easa-color-text-secondary)]">
          Your current role is <strong>{roleLabel(role)}</strong> at {organizationName ?? "your school"}.
        </p>
        <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
          Contact an administrator to change your organisation membership, billing access, or role.
        </p>
      </div>
    </div>
  );
}
