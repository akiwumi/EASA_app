const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminEmail = process.env.SIGNOFF_ADMIN_EMAIL ?? "admin@easa.local";
const nonAdminEmail = process.env.SIGNOFF_NON_ADMIN_EMAIL ?? "viewer+signoff@easa.local";
const nonAdminPassword = process.env.SIGNOFF_NON_ADMIN_PASSWORD ?? "EasaTest123";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return data;
}

async function listAuthUsers(page = 1, perPage = 200) {
  const url = new URL(`${supabaseUrl}/auth/v1/admin/users`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  return fetchJson(url.toString(), { method: "GET" });
}

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const data = await listAuthUsers(page);
    const users = Array.isArray(data?.users) ? data.users : [];
    const match = users.find((user) => String(user?.email ?? "").toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length === 0 || users.length < 200) break;
  }
  return null;
}

async function upsertAuthUser(email, password, metadata = {}) {
  const existing = await findAuthUserByEmail(email);
  if (existing?.id) {
    await fetchJson(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata ?? {}),
          ...metadata,
        },
      }),
    });
    return existing.id;
  }

  const created = await fetchJson(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    }),
  });

  return created.id;
}

async function selectSingle(path, query) {
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  const rows = await fetchJson(url.toString(), { method: "GET" });
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function insertRow(path, payload) {
  const url = `${supabaseUrl}/rest/v1/${path}`;
  const rows = await fetchJson(url, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  return Array.isArray(rows) ? rows[0] ?? null : rows;
}

async function upsertRows(path, payload, onConflict) {
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);
  if (onConflict) url.searchParams.set("on_conflict", onConflict);
  const rows = await fetchJson(url.toString(), {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
  return Array.isArray(rows) ? rows : [];
}

async function patchAiFindingActive(findingId) {
  const endpoint = `${supabaseUrl}/rest/v1/ai_findings?id=eq.${findingId}`;
  const basePatch = {
    deleted_at: null,
    deleted_by: null,
  };

  try {
    await fetchJson(endpoint, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        ...basePatch,
        dismissed_by: null,
        dismissed_at: null,
        dismissal_reason: null,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("dismissal_reason")) throw error;
    await fetchJson(endpoint, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(basePatch),
    });
  }
}

async function main() {
  const adminUser = await findAuthUserByEmail(adminEmail);
  if (!adminUser?.id) {
    throw new Error(`Admin user not found (${adminEmail}).`);
  }

  const membership = await selectSingle("org_users", {
    select: "organization_id,role",
    user_id: `eq.${adminUser.id}`,
    limit: "1",
  });
  if (!membership?.organization_id) {
    throw new Error(`No org membership found for admin user ${adminEmail}.`);
  }
  const orgId = membership.organization_id;

  const nonAdminUserId = await upsertAuthUser(nonAdminEmail, nonAdminPassword, {
    app_role: "viewer",
    organization_id: orgId,
    display_name: "Signoff Viewer",
  });

  await upsertRows(
    "org_users",
    [
      {
        organization_id: orgId,
        user_id: nonAdminUserId,
        role: "viewer",
      },
    ],
    "organization_id,user_id",
  );

  await upsertRows(
    "user_profiles",
    [
      {
        id: nonAdminUserId,
        display_name: "Signoff Viewer",
      },
    ],
    "id",
  );

  const flightbook =
    (await selectSingle("flightbooks", {
      select: "id",
      organization_id: `eq.${orgId}`,
      name: "eq.Signoff Flightbook",
      limit: "1",
    })) ??
    (await insertRow("flightbooks", {
      organization_id: orgId,
      name: "Signoff Flightbook",
      doc_type: "operations_manual",
      version_label: "v1-signoff",
      active: true,
    }));

  const section =
    (await selectSingle("flightbook_sections", {
      select: "id",
      organization_id: `eq.${orgId}`,
      flightbook_id: `eq.${flightbook.id}`,
      section_number: "eq.1.1",
      limit: "1",
    })) ??
    (await insertRow("flightbook_sections", {
      organization_id: orgId,
      flightbook_id: flightbook.id,
      section_number: "1.1",
      title: "Regulatory updates handling",
      body: "Initial policy text for signoff validation.",
      sort_order: 1,
    }));

  const sourceUrl = `https://signoff.easa.local/feed/${orgId}`;
  const source =
    (await selectSingle("sources", {
      select: "id",
      organization_id: `eq.${orgId}`,
      url: `eq.${sourceUrl}`,
      limit: "1",
    })) ??
    (await insertRow("sources", {
      organization_id: orgId,
      url: sourceUrl,
      type: "rss",
      active: true,
    }));

  const rssExternalId = `signoff-item-${orgId}`;
  const rssItem =
    (await selectSingle("rss_items", {
      select: "id",
      organization_id: `eq.${orgId}`,
      source_id: `eq.${source.id}`,
      external_id: `eq.${rssExternalId}`,
      limit: "1",
    })) ??
    (await insertRow("rss_items", {
      organization_id: orgId,
      source_id: source.id,
      external_id: rssExternalId,
      title: "EASA Part-CAT update for signoff",
      summary: "Synthetic update item used for runtime signoff validation.",
      link: "https://signoff.easa.local/update",
      category: "Part-CAT",
      published_at: new Date().toISOString(),
    }));

  const findingSummary = "Synthetic finding summary for signoff validation.";

  const finding =
    (await selectSingle("ai_findings", {
      select: "id",
      organization_id: `eq.${orgId}`,
      rss_item_id: `eq.${rssItem.id}`,
      limit: "1",
    })) ??
    (await insertRow("ai_findings", {
      organization_id: orgId,
      rss_item_id: rssItem.id,
      impact: "medium",
      confidence: "low",
      mapped_section: "1.1",
      status: "new",
      category: "Part-CAT",
      summary: findingSummary,
    }));

  const regDocument =
    (await selectSingle("reg_documents", {
      select: "id",
      organization_id: `eq.${orgId}`,
      reg_number: "eq.EASA-OPS-SIGNOFF",
      limit: "1",
    })) ??
    (await insertRow("reg_documents", {
      organization_id: orgId,
      source_id: source.id,
      title: "Synthetic EASA OPS signoff document",
      reg_number: "EASA-OPS-SIGNOFF",
      part: "Part-CAT",
      url: "https://signoff.easa.local/regdoc",
    }));

  const regChange =
    (await selectSingle("reg_changes", {
      select: "id",
      organization_id: `eq.${orgId}`,
      ai_finding_id: `eq.${finding.id}`,
      limit: "1",
    })) ??
    (await insertRow("reg_changes", {
      organization_id: orgId,
      source_id: source.id,
      reg_document_id: regDocument.id,
      section_ref: "CAT.GEN.MPA.100",
      change_type: "updated",
      diff_text: "Synthetic diff text for signoff queue validation.",
      ai_finding_id: finding.id,
    }));

  const proposedUpdate =
    (await selectSingle("proposed_updates", {
      select: "id,status",
      organization_id: `eq.${orgId}`,
      reg_change_id: `eq.${regChange.id}`,
      limit: "1",
    })) ??
    (await insertRow("proposed_updates", {
      organization_id: orgId,
      reg_change_id: regChange.id,
      flightbook_section_id: section.id,
      classification: "watchlist",
      risk_level: "medium",
      ai_rationale: findingSummary,
      ai_suggested_text: "Updated policy text generated for signoff validation.",
      confidence_score: 32.5,
      status: "pending",
      ai_model: "signoff-seed",
      ai_generated_at: new Date().toISOString(),
    }));

  // Ensure it remains a pending, draft-present item for queue checks.
  await fetchJson(`${supabaseUrl}/rest/v1/proposed_updates?id=eq.${proposedUpdate.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "pending",
      ai_suggested_text: "Updated policy text generated for signoff validation.",
      confidence_score: 32.5,
      updated_at: new Date().toISOString(),
    }),
  });

  // Ensure finding is active (not previously dismissed in earlier runs).
  await patchAiFindingActive(finding.id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        orgId,
        nonAdmin: {
          email: nonAdminEmail,
          password: nonAdminPassword,
        },
        fixture: {
          sourceId: source.id,
          rssItemId: rssItem.id,
          findingId: finding.id,
          regChangeId: regChange.id,
          proposedUpdateId: proposedUpdate.id,
          flightbookId: flightbook.id,
          sectionId: section.id,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

