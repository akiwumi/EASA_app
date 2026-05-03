"use client";

import { useEffect, useState } from "react";
import { Trash2, UserPlus, ShieldCheck, GraduationCap, UserRound } from "lucide-react";
import type { CurrentOrgRole, UserDirectoryEntry } from "@/lib/types/domain";

const ROLE_OPTIONS: Array<{ value: CurrentOrgRole; label: string }> = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

export default function UsersTab() {
  const [users, setUsers] = useState<UserDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CurrentOrgRole>("student");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      setError("Failed to load users");
      setLoading(false);
      return;
    }
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function invite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const json = await res.json();
    if (!res.ok) {
      setInviteMsg(`Error: ${json.error}`);
    } else {
      setInviteMsg("Invitation sent. The user will verify their email before first sign-in.");
      setInviteEmail("");
      await load();
    }
    setInviting(false);
  }

  async function changeRole(userId: string, role: CurrentOrgRole) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    await load();
  }

  async function removeUser(userId: string, email: string | null) {
    if (!confirm(`Delete ${email ?? userId}? If they only belong to this school, their auth account will also be deleted.`)) return;
    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Unable to delete user.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="easa-card p-5">
        <h2 className="mb-2 text-sm font-semibold">Invite user</h2>
        <p className="mb-4 text-xs text-[var(--easa-color-text-muted)]">
          Admins send invitations, set the starting role, and keep billing access restricted to admins only.
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            className="easa-input min-w-[220px] flex-1"
            placeholder="user@example.com"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && invite()}
          />
          <select
            className="easa-input w-36"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as CurrentOrgRole)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            className="easa-btn primary flex items-center gap-2"
            disabled={inviting || !inviteEmail.trim()}
            onClick={invite}
          >
            <UserPlus size={16} strokeWidth={1.75} />
            {inviting ? "Sending…" : "Send invite"}
          </button>
        </div>
        {inviteMsg && (
          <p className={`mt-3 text-sm ${inviteMsg.startsWith("Error") ? "text-[var(--easa-color-accent-pink)]" : "text-[var(--easa-color-accent-green)]"}`}>
            {inviteMsg}
          </p>
        )}
      </div>

      <div className="easa-card overflow-hidden p-0">
        {loading ? (
          <p className="p-5 text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
        ) : error ? (
          <p className="p-5 text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
        ) : users.length === 0 ? (
          <p className="p-5 text-sm text-[var(--easa-color-text-muted)]">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">User</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Verification</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Last sign-in</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId} className="border-b border-[var(--easa-color-border)] align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--easa-color-surface-2)]">
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={u.displayName ?? u.email ?? "User"} className="h-full w-full object-cover" src={u.avatarUrl} />
                        ) : (
                          <UserRound size={18} className="text-[var(--easa-color-text-muted)]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{u.displayName ?? u.email ?? "—"}</p>
                        {u.email && (
                          <p className="text-xs text-[var(--easa-color-text-muted)]">{u.email}</p>
                        )}
                        {u.phone && (
                          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">{u.phone}</p>
                        )}
                        {u.personalNotes && (
                          <p className="mt-1 max-w-md text-xs text-[var(--easa-color-text-muted)]">{u.personalNotes}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">
                    {u.emailConfirmedAt ? "Verified" : "Pending email verification"}
                  </td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">
                    {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="easa-input w-36 py-1 text-xs"
                      value={u.role}
                      onChange={(e) => changeRole(u.userId, e.target.value as CurrentOrgRole)}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {u.role === "viewer" ? <option value="viewer">Viewer (legacy)</option> : null}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="rounded-lg p-2 text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-accent-pink)]"
                      title="Delete user"
                      onClick={() => removeUser(u.userId, u.email)}
                    >
                      <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[var(--easa-color-text-muted)]">
        <span className="flex items-center gap-1"><ShieldCheck size={13} /> Admin — invites users, manages billing, and can delete other users</span>
        <span className="flex items-center gap-1"><GraduationCap size={13} /> Instructor — staff access without billing control</span>
        <span className="flex items-center gap-1"><UserRound size={13} /> Student — standard learner access</span>
      </div>

      {users.some((user) => user.role === "viewer") ? (
        <p className="text-xs text-[var(--easa-color-text-muted)]">
          Legacy `viewer` users are still supported. You can move them to `student` whenever you are ready.
        </p>
      ) : null}
    </div>
  );
}
