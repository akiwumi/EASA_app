import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/supabase/profile";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getAuthContext() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  await ensureUserProfile(supabase, user);

  return { supabase, user };
}

// GET /api/profile — returns the current user's profile plus org membership context
export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const [{ data: profile }, { data: membership }, { data: organization }] = await Promise.all([
    admin
      .from("user_profiles")
      .select(
        "id, display_name, avatar_url, personal_notes, phone, notification_email, notification_inapp, notification_digest",
      )
      .eq("id", auth.user.id)
      .maybeSingle(),
    admin
      .from("org_users")
      .select("organization_id, role")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    admin
      .from("org_users")
      .select("organization_id, organizations(name)")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    profile: profile ?? {
      id: auth.user.id,
      display_name: auth.user.email?.split("@")[0] ?? null,
      avatar_url: null,
      personal_notes: null,
      phone: null,
      notification_email: true,
      notification_inapp: true,
      notification_digest: "immediate",
    },
    email: auth.user.email ?? null,
    emailConfirmedAt: auth.user.email_confirmed_at ?? null,
    role: membership?.role ?? null,
    organizationName:
      (organization?.organizations as { name?: string } | null)?.name ?? null,
  });
}

// PATCH /api/profile — update the current user's editable profile fields
export async function PATCH(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    display_name?: string;
    avatar_url?: string | null;
    personal_notes?: string | null;
    phone?: string | null;
    notification_email?: boolean;
    notification_inapp?: boolean;
    notification_digest?: string;
  };

  const allowed = [
    "display_name",
    "avatar_url",
    "personal_notes",
    "phone",
    "notification_email",
    "notification_inapp",
    "notification_digest",
  ] as const;

  const updates: Record<string, unknown> = {
    id: auth.user.id,
    updated_at: new Date().toISOString(),
  };

  for (const key of allowed) {
    if (!(key in body)) continue;
    const value = body[key];
    updates[key] =
      typeof value === "string"
        ? value.trim() || null
        : value;
  }

  if (Object.keys(updates).length === 2) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .upsert(updates, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

// POST /api/profile — change password while signed in
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = (await request.json()) as { password?: string };
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { error } = await auth.supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
