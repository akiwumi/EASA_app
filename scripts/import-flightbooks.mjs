#!/usr/bin/env node
/**
 * One-time import of fixture flight books into flightbooks + flightbook_sections.
 * Usage: node scripts/import-flightbooks.mjs [path/to/fixture.json]
 * Requires SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fixturePath = resolve(
  process.argv[2] ??
    "data/fixtures/flightbooks/sample-import.json",
);

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function rest(table, method, query, body) {
  const q = query ? `?${query}` : "";
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}${q}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${table}: ${text}`);
  }
  if (res.status === 204) return [];
  return res.json();
}

async function main() {
  const raw = readFileSync(fixturePath, "utf8");
  const data = JSON.parse(raw);
  const organizationId =
    process.env.IMPORT_ORG_ID ?? data.organizationId;

  if (!organizationId || !Array.isArray(data.documents)) {
    throw new Error("Invalid fixture: need organizationId and documents[].");
  }

  for (const doc of data.documents) {
    const [book] = await rest("flightbooks", "POST", null, {
      organization_id: organizationId,
      name: doc.name,
      doc_type: doc.docType,
      version_label: doc.versionLabel ?? null,
      active: true,
    });

    const flightbookId = book.id;
    let order = 0;
    for (const sec of doc.sections ?? []) {
      order += 1;
      await rest("flightbook_sections", "POST", null, {
        organization_id: organizationId,
        flightbook_id: flightbookId,
        parent_id: null,
        section_number: sec.sectionNumber ?? null,
        title: sec.title ?? null,
        body: sec.body ?? "",
        sort_order: sec.sortOrder ?? order,
      });
    }
    console.log(`Imported "${doc.name}" (${doc.sections?.length ?? 0} sections).`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
