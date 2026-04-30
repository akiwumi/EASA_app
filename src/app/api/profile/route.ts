import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getAuthUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

// GET /api/profile — returns the current user's profile
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();

  // Upsert ensures a profile row always exists
  const { data: existing } = await admin
    .from("user_profiles")
    .select("id, display_name, notification_email, notification_inapp, notification_digest")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    // Create default profile row on first load
    await admin.from("user_profiles").insert({
      id: user.id,
      display_name: user.email?.split("@")[0] ?? null,
    });
  }

  const profile = existing ?? {
    id: user.id,
    display_name: user.email?.split("@")[0] ?? null,
    notification_email: true,
    notification_inapp: true,
    notification_digest: "immediate",
  };

  return NextResponse.json({ profile, email: user.email });
}

// PATCH /api/profile — update display name or notification preferences
export async function PATCH(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    display_name?: string;
    notification_email?: boolean;
    notification_inapp?: boolean;
    notification_digest?: string;
  };

  const allowed = ["display_name", "notification_email", "notification_inapp", "notification_digest"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = (body as Record<string, unknown>)[key];
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const admin = getAdminClient();

  // Upsert so the profile row is always created if missing
  const { error } = await admin
    .from("user_profiles")
    .upsert({ id: user.id, ...updates }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

// POST /api/profile/password — change password
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = (await request.json()) as { password?: string };
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
