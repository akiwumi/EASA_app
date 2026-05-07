import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/supabase/profile";
import { getOrgAccessContext } from "@/lib/supabase/access";

const NOTIFICATION_DIGESTS = new Set(["immediate", "daily", "partial", "weekly"]);

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
  const ctx = await getOrgAccessContext();
  const [{ data: profile }, { data: organization }] = await Promise.all([
    admin
      .from("user_profiles")
      .select(
        "id, display_name, avatar_url, personal_notes, phone, notification_email, notification_inapp, notification_digest",
      )
      .eq("id", auth.user.id)
      .maybeSingle(),
    admin
      .from("organizations")
      .select("name")
      .eq("id", ctx?.orgId ?? "")
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
    role: ctx?.role ?? null,
    organizationName: (organization?.name as string | null | undefined) ?? null,
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
    if (key === "notification_digest") {
      updates[key] =
        typeof value === "string" && NOTIFICATION_DIGESTS.has(value)
          ? value
          : "immediate";
      continue;
    }
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
