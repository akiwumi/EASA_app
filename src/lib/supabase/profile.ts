import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingTableError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "")
  );
}

function isRowLevelSecurityError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "42501" ||
    /row-level security policy/i.test(error.message ?? "")
  );
}

export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const { data, error: selectError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    if (isMissingTableError(selectError) || isRowLevelSecurityError(selectError)) {
      return;
    }
    console.error("ensureUserProfile:", selectError.message);
    return;
  }

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

  if (
    error &&
    error.code !== "23505" &&
    !isMissingTableError(error) &&
    !isRowLevelSecurityError(error)
  ) {
    console.error("ensureUserProfile:", error.message);
  }
}
