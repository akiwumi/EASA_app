import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function isMissingTableError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "")
  );
}

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

// GET /api/notifications — returns notifications for the current user
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select(
      "id, type, title, body, related_entity_type, related_entity_id, read, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error && isMissingTableError(error)) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unreadCount });
}

// PATCH /api/notifications  body: { ids?: string[], markAllRead?: boolean }
export async function PATCH(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, markAllRead } = (await request.json()) as {
    ids?: string[];
    markAllRead?: boolean;
  };

  const admin = getAdminClient();

  if (markAllRead) {
    const { error } = await admin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error && isMissingTableError(error)) {
      return NextResponse.json({ ok: true });
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (ids?.length) {
    const { error } = await admin
      .from("notifications")
      .update({ read: true })
      .in("id", ids)
      .eq("user_id", user.id);

    if (error && isMissingTableError(error)) {
      return NextResponse.json({ ok: true });
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "ids or markAllRead required" }, { status: 400 });
}
