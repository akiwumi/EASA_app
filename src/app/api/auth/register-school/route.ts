import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/access";

type RegisterBody = {
  schoolName?: string;
  adminName?: string;
  email?: string;
  password?: string;
};

const DEFAULT_RSS_FEEDS = [
  "https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml",
  "https://www.easa.europa.eu/en/newsroom-and-events/press-releases/feed.xml",
  "https://www.easa.europa.eu/en/document-library/notices-of-proposed-amendment/feed.xml",
  "https://www.easa.europa.eu/en/document-library/opinions/feed.xml",
  "https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml",
  "https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/feed.xml",
] as const;

const DEAD_RSS_FEEDS = [
  "https://www.easa.europa.eu/en/rss/news",
  "https://www.easa.europa.eu/en/rss/consultations",
  "https://www.easa.europa.eu/en/rss/publications",
  "https://example.com/feed.xml",
] as const;

function normalizeSchoolName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

async function ensureDefaultFeeds() {
  const admin = getSupabaseAdminClient();

  if (DEAD_RSS_FEEDS.length > 0) {
    await admin.from("sources").delete().in("url", [...DEAD_RSS_FEEDS]);
  }

  for (const url of DEFAULT_RSS_FEEDS) {
    const { data: existing } = await admin
      .from("sources")
      .select("id, organization_id, active")
      .eq("url", url)
      .maybeSingle();

    if (!existing) {
      await admin.from("sources").insert({
        organization_id: null,
        url,
        type: "rss",
        active: true,
      });
      continue;
    }

    if (existing.organization_id !== null || existing.active !== true) {
      await admin
        .from("sources")
        .update({ organization_id: null, active: true, type: "rss" })
        .eq("id", existing.id as string);
    }
  }
}

async function ensureDefaultAiConfig(organizationId: string) {
  const admin = getSupabaseAdminClient();
  await admin.from("ai_provider_config").upsert(
    {
      organization_id: organizationId,
      provider: "openai",
      model: "gpt-4o",
      api_key: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id", ignoreDuplicates: true },
  );
}

async function ensureLifetimeAccess(organizationId: string) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("organization_subscriptions").upsert(
    {
      organization_id: organizationId,
      subscription_status: "active",
      billing_state: "active",
      cancel_at_period_end: false,
      access_expires_at: null,
      locked_at: null,
      suspension_reason: null,
    },
    { onConflict: "organization_id" },
  );

  if (error && !["PGRST205", "42P01"].includes(error.code ?? "")) {
    throw new Error(error.message);
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as RegisterBody;
  const schoolName = normalizeSchoolName(body.schoolName ?? "");
  const adminName = (body.adminName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!schoolName || !adminName || !email || !password) {
    return NextResponse.json(
      { error: "School name, admin name, email, and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdminClient();
  await ensureDefaultFeeds();

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: adminName,
      school_name: schoolName,
    },
  });

  if (createUserError || !createdUser.user) {
    return NextResponse.json(
      { error: createUserError?.message ?? "Unable to create the user account." },
      { status: 400 },
    );
  }

  const userId = createdUser.user.id;
  let organizationId: string | null = null;

  try {
    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .insert({ name: schoolName })
      .select("id")
      .single();

    if (organizationError || !organization?.id) {
      throw new Error(organizationError?.message ?? "Unable to create the organization.");
    }

    organizationId = organization.id as string;

    const { error: membershipError } = await admin.from("org_users").insert({
      organization_id: organizationId,
      user_id: userId,
      role: "admin",
    });

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    await ensureLifetimeAccess(organizationId);
    await ensureDefaultAiConfig(organizationId);

    const { error: profileError } = await admin.from("user_profiles").upsert({
      id: userId,
      display_name: adminName,
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: brandingError } = await admin.from("organization_branding").upsert(
      {
        organization_id: organizationId,
        public_name: schoolName,
        legal_name: schoolName,
        contact_email: email,
      },
      { onConflict: "organization_id" },
    );

    if (brandingError && !["PGRST205", "42P01"].includes(brandingError.code ?? "")) {
      throw new Error(brandingError.message);
    }

    return NextResponse.json({
      ok: true,
      organizationId,
      schoolName,
    });
  } catch (error) {
    if (organizationId) {
      await admin.from("organizations").delete().eq("id", organizationId);
    }
    await admin.auth.admin.deleteUser(userId);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to finish registration." },
      { status: 400 },
    );
  }
}
