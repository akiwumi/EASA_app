"use client";

import { useEffect, useState } from "react";
import { Trash2, UserPlus, ShieldCheck, Eye } from "lucide-react";

interface OrgUser {
  userId: string;
  role: string;
  joinedAt: string;
  email: string | null;
  lastSignIn: string | null;
  displayName: string | null;
}

export default function UsersTab() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "admin">("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/users");
    if (!res.ok) { setError("Failed to load users"); setLoading(false); return; }
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
    if (!res.ok) { setInviteMsg(`Error: ${json.error}`); }
    else { setInviteMsg("Invite sent. User added to org."); setInviteEmail(""); load(); }
    setInviting(false);
  }

  async function changeRole(userId: string, role: "admin" | "viewer") {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    load();
  }

  async function removeUser(userId: string, email: string | null) {
    if (!confirm(`Remove ${email ?? userId} from this organisation?`)) return;
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="easa-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Invite user</h2>
        <div className="flex flex-wrap gap-3">
          <input
            className="easa-input flex-1 min-w-[200px]"
            placeholder="user@example.com"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && invite()}
          />
          <select
            className="easa-input w-32"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "viewer" | "admin")}
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
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

      {/* Users table */}
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
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Last sign-in</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId} className="border-b border-[var(--easa-color-border)] last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.displayName ?? u.email ?? "—"}</p>
                    {u.displayName && u.email && (
                      <p className="text-xs text-[var(--easa-color-text-muted)]">{u.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">
                    {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="easa-input w-28 py-1 text-xs"
                      value={u.role}
                      onChange={(e) => changeRole(u.userId, e.target.value as "admin" | "viewer")}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="rounded-lg p-2 text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-accent-pink)]"
                      title="Remove from org"
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

      {/* Role legend */}
      <div className="flex flex-wrap gap-4 text-xs text-[var(--easa-color-text-muted)]">
        <span className="flex items-center gap-1"><ShieldCheck size={13} /> Admin — full access including this panel</span>
        <span className="flex items-center gap-1"><Eye size={13} /> Viewer — read-only access</span>
      </div>
    </div>
  );
}
