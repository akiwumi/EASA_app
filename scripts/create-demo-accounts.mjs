/**
 * Creates two demo admin accounts as separate schools.
 * Run once: node scripts/create-demo-accounts.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ACCOUNTS = [
  {
    email: "admin2@easa.local",
    password: "password123",
    displayName: "Demo Admin 2",
    schoolName: "Alpine Aviation Academy",
  },
  {
    email: "admin3@easa.local",
    password: "password123",
    displayName: "Demo Admin 3",
    schoolName: "Atlantic Flight Training",
  },
];

async function ensurePipelineDefaults(organizationId) {
  // ai_provider_config default
  await admin.from("ai_provider_config").upsert(
    { organization_id: organizationId, provider: "openai", model: "gpt-4o" },
    { onConflict: "organization_id" },
  );

  // pipeline_schedule default
  await admin.from("pipeline_schedules").upsert(
    {
      organization_id: organizationId,
      schedule_type: "weekly",
      day_of_week: 1,
      hour: 7,
      enabled: true,
    },
    { onConflict: "organization_id" },
  );
}

async function findExistingUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Auth lookup: ${error.message}`);
  return (data.users ?? []).find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createAccount({ email, password, displayName, schoolName }) {
  console.log(`\n── Creating: ${schoolName} (${email})`);

  // 1. Create auth user (email pre-confirmed for demo)
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, school_name: schoolName },
  });

  let userId = created?.user?.id;

  if (authErr) {
    if (authErr.message.includes("already been registered") || authErr.message.includes("already exists")) {
      const existingUser = await findExistingUserByEmail(email);
      if (!existingUser?.id) throw new Error(`Auth lookup: existing user not found for ${email}`);
      userId = existingUser.id;
      console.log(`  ⚠  User already exists — repairing access: ${userId}`);
    } else {
      throw new Error(`Auth: ${authErr.message}`);
    }
  } else {
    console.log(`  ✓ Auth user created: ${userId}`);
  }

  if (!userId) throw new Error("Auth: user id missing");

  // 2. Create organisation
  const { data: existingMembership, error: existingMembershipErr } = await admin
    .from("org_users")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (existingMembershipErr && existingMembershipErr.code !== "PGRST116") {
    throw new Error(`Membership lookup: ${existingMembershipErr.message}`);
  }

  let organizationId = existingMembership?.organization_id;

  if (!organizationId) {
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({ name: schoolName })
      .select("id")
      .single();

    if (orgErr) throw new Error(`Organization: ${orgErr.message}`);
    organizationId = org.id;
    console.log(`  ✓ Organisation created: ${organizationId}`);
  } else {
    const { error: orgUpdateErr } = await admin
      .from("organizations")
      .update({ name: schoolName })
      .eq("id", organizationId);

    if (orgUpdateErr) throw new Error(`Organization: ${orgUpdateErr.message}`);
    console.log(`  ✓ Organisation found: ${organizationId}`);
  }

  if (!organizationId) throw new Error("Organization: id missing");

  // 3. Org membership (admin)
  const { error: memberErr } = await admin.from("org_users").upsert({
    organization_id: organizationId,
    user_id: userId,
    role: "admin",
  });
  if (memberErr) throw new Error(`Membership: ${memberErr.message}`);
  console.log(`  ✓ Admin membership set`);

  // 4. User profile
  const { error: profileErr } = await admin.from("user_profiles").upsert({
    id: userId,
    display_name: displayName,
  });
  if (profileErr) throw new Error(`Profile: ${profileErr.message}`);
  console.log(`  ✓ User profile created`);

  // 5. Org branding
  const { error: brandErr } = await admin.from("organization_branding").upsert(
    {
      organization_id: organizationId,
      public_name: schoolName,
      legal_name: schoolName,
      contact_email: email,
    },
    { onConflict: "organization_id" },
  );
  if (brandErr && !["PGRST205", "42P01"].includes(brandErr.code ?? "")) {
    throw new Error(`Branding: ${brandErr.message}`);
  }
  console.log(`  ✓ Branding configured`);

  // 6. Subscription (lifetime demo access, no Stripe interruption)
  const { error: subErr } = await admin.from("organization_subscriptions").upsert(
    {
      organization_id: organizationId,
      subscription_status: "active",
      billing_state: "active",
      cancel_at_period_end: false,
    },
    { onConflict: "organization_id" },
  );
  if (subErr && !["PGRST205", "42P01"].includes(subErr.code ?? "")) {
    throw new Error(`Subscription: ${subErr.message}`);
  }
  console.log(`  ✓ Subscription record created`);

  // 7. Pipeline defaults
  try {
    await ensurePipelineDefaults(organizationId);
    console.log(`  ✓ Pipeline defaults set`);
  } catch (e) {
    console.log(`  ⚠  Pipeline defaults (best-effort): ${e.message}`);
  }

  console.log(`  ✅ Done — ${schoolName}`);
}

for (const account of ACCOUNTS) {
  await createAccount(account);
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Demo accounts ready:

  School: Alpine Aviation Academy
  Email:  admin2@easa.local
  Pass:   password123

  School: Atlantic Flight Training
  Email:  admin3@easa.local
  Pass:   password123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
