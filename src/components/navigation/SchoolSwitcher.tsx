"use client";

import { useEffect, useState } from "react";

type Membership = {
  organization_id: string;
  role: string;
  organizations: {
    id: string;
    name: string;
  };
};

export default function SchoolSwitcher() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orgs")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && Array.isArray(json.memberships)) {
          setMemberships(json.memberships);
        }
      })
      .catch((err) => {
        console.error("[SchoolSwitcher] Failed to fetch memberships:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || memberships.length < 2) return null;

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const organizationId = e.target.value;
    try {
      await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
    } catch (err) {
      console.error("[SchoolSwitcher] Failed to switch org:", err);
    }
    window.location.reload();
  };

  return (
    <select
      onChange={handleChange}
      className="mt-1 w-full rounded-lg border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-2 py-1 text-sm text-[var(--easa-color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--easa-color-brand-primary)]"
      aria-label="Switch school"
    >
      {memberships.map((m) => (
        <option key={m.organization_id} value={m.organization_id}>
          {m.organizations.name}
        </option>
      ))}
    </select>
  );
}
