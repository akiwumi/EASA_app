const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
/** Sign in as "admin" in the app (login page maps this) or use this full email. */
const adminEmail = process.env.ADMIN_EMAIL ?? "admin@easa.local";
/** 6+ chars required by Supabase email auth by default. */
const adminPassword = process.env.ADMIN_PASSWORD ?? "EasaTest123";
const orgName = process.env.ORG_NAME ?? "Demo Flight School";

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
};

async function listAuthUsersPage(page = 1, perPage = 200) {
  const url = new URL(`${supabaseUrl}/auth/v1/admin/users`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`List auth users failed: ${errorText}`);
  }
  const data = await res.json();
  const users = Array.isArray(data?.users) ? data.users : [];
  return { users, total: data?.total ?? users.length };
}

async function findUserIdByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 50; i++) {
    const { users, total } = await listAuthUsersPage(page, perPage);
    const match = users.find(
      (u) => String(u?.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (match?.id) return match.id;
    if (users.length < perPage) return null;
    if (typeof total === "number" && page * perPage >= total) return null;
    page += 1;
  }
  return null;
}

async function updateUserPassword(userId, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Auth user password update failed: ${errorText}`);
  }
}

async function createAdminUser() {
  const existingId = await findUserIdByEmail(adminEmail);
  if (existingId) {
    await updateUserPassword(existingId, adminPassword);
    return existingId;
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: "admin" },
    }),
  });

  if (!userResponse.ok) {
    const errorText = await userResponse.text();
    const hint =
      adminPassword.length < 6
        ? " If the error mentions password length, set Authentication → Providers → Email → Minimum password length to 3 in the Supabase dashboard, or use a longer ADMIN_PASSWORD."
        : "";
    throw new Error(`Auth user creation failed: ${errorText}${hint}`);
  }

  const user = await userResponse.json();
  return user.id;
}

async function getOrCreateOrg() {
  const query = new URLSearchParams({
    select: "id,name",
    name: `eq.${orgName}`,
    limit: "1",
  });

  const getResponse = await fetch(
    `${supabaseUrl}/rest/v1/organizations?${query}`,
    { headers },
  );

  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    throw new Error(`Organization lookup failed: ${errorText}`);
  }

  const existing = await getResponse.json();
  if (existing?.[0]?.id) {
    return existing[0].id;
  }

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/organizations`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ name: orgName }),
  });

  if (!insertResponse.ok) {
    const errorText = await insertResponse.text();
    throw new Error(`Organization creation failed: ${errorText}`);
  }

  const created = await insertResponse.json();
  return created?.[0]?.id;
}

async function addAdminUser(orgId, userId) {
  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/org_users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      organization_id: orgId,
      user_id: userId,
      role: "admin",
    }),
  });

  if (insertResponse.ok) return;
  const errorText = await insertResponse.text();
  if (insertResponse.status === 409 || /duplicate|unique/i.test(errorText)) {
    return;
  }
  throw new Error(`Org user insert failed: ${errorText}`);
}

async function ensureUserProfile(userId, email) {
  const displayName = email?.split("@")[0] ?? null;
  const upsertResponse = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?on_conflict=id`,
    {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: userId,
        display_name: displayName,
      }),
    },
  );

  if (!upsertResponse.ok) {
    const errorText = await upsertResponse.text();
    console.warn(`user_profiles upsert: ${errorText}`);
  }
}

async function main() {
  const userId = await createAdminUser();
  const orgId = await getOrCreateOrg();
  await addAdminUser(orgId, userId);
  await ensureUserProfile(userId, adminEmail);

  console.log("Dummy admin is ready.");
  console.log(`Sign in with login: admin  (or email ${adminEmail})`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Organization: ${orgName}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
