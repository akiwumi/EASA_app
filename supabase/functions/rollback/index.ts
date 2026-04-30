// EASA Compliance App — rollback Edge Function
// MASTER_BUILD §9.8 — Rollback
//
// Input:  POST { sectionId, targetVersionNumber, reason? }
// Auth:   Bearer JWT required; user must be admin role
//
// Steps:
//   1. Verify actor is admin
//   2. Fetch the target version body
//   3. Fetch the current section body (to snapshot before rollback)
//   4. INSERT flightbook_section_versions (current body as checkpoint)
//   5. UPDATE flightbook_sections SET body = target body
//   6. INSERT audit_log
//   7. INSERT notifications for all org members
//
// Deploy: supabase functions deploy rollback --use-api

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the JWT and get the calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged DB operations
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- Role check: admin only ---
    const { data: orgUser } = await admin
      .from("org_users")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!orgUser || orgUser.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId: string = orgUser.organization_id as string;

    // --- Parse body ---
    const { sectionId, targetVersionNumber, reason } = (await req.json()) as {
      sectionId?: string;
      targetVersionNumber?: number;
      reason?: string;
    };

    if (!sectionId || targetVersionNumber == null) {
      return new Response(
        JSON.stringify({ error: "sectionId and targetVersionNumber are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- 1. Fetch target version body ---
    const { data: targetVersion, error: tvErr } = await admin
      .from("flightbook_section_versions")
      .select("body, version_number")
      .eq("flightbook_section_id", sectionId)
      .eq("version_number", targetVersionNumber)
      .maybeSingle();

    if (tvErr || !targetVersion) {
      return new Response(JSON.stringify({ error: "Target version not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 2. Fetch current section ---
    const { data: section, error: secErr } = await admin
      .from("flightbook_sections")
      .select("body, organization_id")
      .eq("id", sectionId)
      .maybeSingle();

    if (secErr || !section) {
      return new Response(JSON.stringify({ error: "Section not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 3. Get next version number ---
    const { data: maxVerRow } = await admin
      .from("flightbook_section_versions")
      .select("version_number")
      .eq("flightbook_section_id", sectionId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersionNumber = ((maxVerRow?.version_number as number | null) ?? 0) + 1;

    // --- 4. Snapshot current body before rollback ---
    const { error: snapErr } = await admin.from("flightbook_section_versions").insert({
      organization_id: orgId,
      flightbook_section_id: sectionId,
      body: section.body,
      version_number: newVersionNumber,
      change_source: "rollback",
      created_by: user.id,
    });

    if (snapErr) {
      return new Response(JSON.stringify({ error: snapErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 5. Apply target body ---
    const { error: updateErr } = await admin
      .from("flightbook_sections")
      .update({ body: targetVersion.body, updated_at: new Date().toISOString() })
      .eq("id", sectionId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 6. Audit log ---
    await admin.from("audit_log").insert({
      organization_id: orgId,
      actor_id: user.id,
      action: "rollback",
      entity_type: "flightbook_section",
      entity_id: sectionId,
      payload: {
        fromVersion: newVersionNumber,
        toVersion: targetVersionNumber,
        reason: reason ?? null,
      },
    });

    // --- 7. Notify all org members ---
    const { data: orgUsers } = await admin
      .from("org_users")
      .select("user_id")
      .eq("organization_id", orgId);

    if (orgUsers?.length) {
      const notifRows = orgUsers.map((ou: { user_id: string }) => ({
        organization_id: orgId,
        user_id: ou.user_id,
        type: "rollback",
        title: "Section rolled back",
        body: reason
          ? `Rolled back to version ${targetVersionNumber}. Reason: ${reason}`
          : `Section rolled back to version ${targetVersionNumber}.`,
        related_entity_type: "flightbook_section",
        related_entity_id: sectionId,
      }));
      await admin.from("notifications").insert(notifRows);
    }

    return new Response(
      JSON.stringify({ ok: true, newVersionNumber }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
