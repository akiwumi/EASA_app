// EASA Compliance App — apply-update Edge Function
// MASTER_BUILD §9.7 — Apply Update (Phase 3)
//
// Input:  POST { proposedUpdateId, flightbookSectionId, aiSuggestedText, comment? }
// Auth:   Bearer JWT required; user must be admin role
//
// Steps:
//   1. Verify actor is admin
//   2. Conflict detection — block if section was modified after update was proposed
//   3. Snapshot current section body as a new flightbook_section_version
//   4. UPDATE flightbook_sections body
//   5. UPDATE proposed_updates status = "approved"
//   6. INSERT audit_log
//
// Deploy: supabase functions deploy apply-update --use-api

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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check admin role
    const { data: orgUser } = await admin
      .from("org_users")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!orgUser) {
      return new Response(JSON.stringify({ error: "No organisation found for user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((orgUser.role as string) !== "admin") {
      return new Response(JSON.stringify({ error: "Admin role required to approve updates" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = orgUser.organization_id as string;

    const { proposedUpdateId, flightbookSectionId, aiSuggestedText, comment } = (await req.json()) as {
      proposedUpdateId?: string;
      flightbookSectionId?: string;
      aiSuggestedText?: string;
      comment?: string;
    };

    if (!proposedUpdateId || !flightbookSectionId || !aiSuggestedText) {
      return new Response(
        JSON.stringify({ error: "proposedUpdateId, flightbookSectionId and aiSuggestedText required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch proposed update
    const { data: update } = await admin
      .from("proposed_updates")
      .select("id, created_at, status")
      .eq("id", proposedUpdateId)
      .maybeSingle();

    if (!update) {
      return new Response(JSON.stringify({ error: "Proposed update not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((update.status as string) === "approved") {
      return new Response(JSON.stringify({ error: "Update is already approved" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current section
    const { data: section } = await admin
      .from("flightbook_sections")
      .select("id, body, organization_id, updated_at")
      .eq("id", flightbookSectionId)
      .maybeSingle();

    if (!section) {
      return new Response(JSON.stringify({ error: "Flight book section not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Conflict detection — section modified after update was proposed
    const sectionUpdatedAt = new Date(section.updated_at as string).getTime();
    const updateCreatedAt = new Date(update.created_at as string).getTime();
    if (sectionUpdatedAt > updateCreatedAt) {
      return new Response(
        JSON.stringify({
          error:
            "Conflict: the flight book section was modified after this update was proposed. Review the current section body before approving.",
          conflict: true,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Next version number
    const { data: maxVerRow } = await admin
      .from("flightbook_section_versions")
      .select("version_number")
      .eq("flightbook_section_id", flightbookSectionId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = ((maxVerRow?.version_number as number | null) ?? 0) + 1;

    // Snapshot current body
    const { error: versionErr } = await admin.from("flightbook_section_versions").insert({
      organization_id: (section.organization_id as string | null) ?? orgId,
      flightbook_section_id: flightbookSectionId,
      body: section.body as string,
      version_number: nextVersion,
      change_source: "approved_update",
      created_by: user.id,
    });

    if (versionErr) {
      return new Response(JSON.stringify({ error: versionErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply new body
    await admin
      .from("flightbook_sections")
      .update({ body: aiSuggestedText, updated_at: new Date().toISOString() })
      .eq("id", flightbookSectionId);

    // Mark update approved
    await admin
      .from("proposed_updates")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", proposedUpdateId);

    // Audit log
    await admin.from("audit_log").insert({
      organization_id: orgId,
      actor_id: user.id,
      action: "proposed_update_approved",
      entity_type: "proposed_update",
      entity_id: proposedUpdateId,
      payload: {
        flightbookSectionId,
        versionNumber: nextVersion,
        comment: comment ?? null,
      },
    });

    return new Response(
      JSON.stringify({ ok: true, versionNumber: nextVersion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
