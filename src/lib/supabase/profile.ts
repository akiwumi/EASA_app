import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const { data } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (data) {
    return;
  }

  const displayName =
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ??
    user.email?.split("@")[0] ??
    null;

  const { error } = await supabase.from("user_profiles").insert({
    id: user.id,
    display_name: displayName,
  });

  if (error && error.code !== "23505") {
    console.error("ensureUserProfile:", error.message);
  }
}
