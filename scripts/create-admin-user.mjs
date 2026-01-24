const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL ?? "admin@demo.local";
const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
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

async function createAdminUser() {
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
    throw new Error(`Auth user creation failed: ${errorText}`);
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

  if (!insertResponse.ok) {
    const errorText = await insertResponse.text();
    throw new Error(`Org user insert failed: ${errorText}`);
  }
}

async function main() {
  const userId = await createAdminUser();
  const orgId = await getOrCreateOrg();
  await addAdminUser(orgId, userId);

  console.log("Admin user created.");
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Organization: ${orgName}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
