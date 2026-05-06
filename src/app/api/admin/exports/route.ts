import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";

function isMissingSchemaError(error: { code?: string | null; message?: string | null } | null | undefined) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    /could not find the table/i.test(error?.message ?? "") ||
    /relation .* does not exist/i.test(error?.message ?? "")
  );
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function buildCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "No data\n";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
  ];
  return lines.join("\n");
}

function csvResponse(filename: string, rows: Record<string, unknown>[]) {
  return new NextResponse(buildCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function loadSummary(orgId: string) {
  const admin = getSupabaseAdminClient();
  const [
    manualExports,
    assignments,
    acknowledgements,
    signoffs,
    formSubmissions,
  ] = await Promise.all([
    admin
      .from("flightbook_exports")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("document_assignments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("acknowledgements")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("training_signoffs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("training_form_submissions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
  ]);

  const { data: recentManualExports, error: recentError } = await admin
    .from("flightbook_exports")
    .select(`
      id,
      flightbook_id,
      version_number,
      change_source,
      note,
      created_at,
      flightbooks (
        name
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentError && isMissingSchemaError(recentError)) {
    return {
      counts: {
        manualExports: 0,
        assignments: Number(assignments.count ?? 0),
        acknowledgements: Number(acknowledgements.count ?? 0),
        signoffs: Number(signoffs.count ?? 0),
        formSubmissions: 0,
      },
      recentManualExports: [],
      formsReady: false,
    };
  }

  return {
    counts: {
      manualExports: Number(manualExports.count ?? 0),
      assignments: Number(assignments.count ?? 0),
      acknowledgements: Number(acknowledgements.count ?? 0),
      signoffs: Number(signoffs.count ?? 0),
      formSubmissions: isMissingSchemaError(formSubmissions.error) ? 0 : Number(formSubmissions.count ?? 0),
    },
    recentManualExports: (recentManualExports ?? []).map((row) => {
      const flightbook = unwrapJoin(row.flightbooks as { name: string | null } | { name: string | null }[] | null);
      return {
        id: String(row.id),
        flightbookId: String(row.flightbook_id),
        name: (flightbook?.name as string | null) ?? "Flight book",
        versionNumber: Number(row.version_number ?? 0),
        changeSource: (row.change_source as string | null) ?? null,
        note: (row.note as string | null) ?? null,
        createdAt: (row.created_at as string | null) ?? null,
      };
    }),
    formsReady: !isMissingSchemaError(formSubmissions.error),
  };
}

async function exportAssignments(orgId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("document_assignments")
    .select(`
      id,
      title,
      status,
      due_at,
      created_at,
      user_id,
      assigned_by,
      training_lessons (
        title,
        lesson_code
      ),
      training_programmes (
        name,
        code
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error && isMissingSchemaError(error)) {
    return csvResponse("training-assignments.csv", []);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return csvResponse(
    "training-assignments.csv",
    (data ?? []).map((row) => {
      const lesson = unwrapJoin(row.training_lessons as { title: string | null; lesson_code: string | null } | { title: string | null; lesson_code: string | null }[] | null);
      const programme = unwrapJoin(row.training_programmes as { name: string | null; code: string | null } | { name: string | null; code: string | null }[] | null);
      return {
        assignment_id: row.id,
        title: row.title,
        status: row.status,
        due_at: row.due_at,
        created_at: row.created_at,
        user_id: row.user_id,
        assigned_by: row.assigned_by,
        lesson: lesson?.title ?? "",
        lesson_code: lesson?.lesson_code ?? "",
        programme: programme?.name ?? "",
        programme_code: programme?.code ?? "",
      };
    }),
  );
}

async function exportAcknowledgements(orgId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("acknowledgements")
    .select(`
      id,
      user_id,
      status,
      acknowledged_at,
      acknowledgement_note,
      created_at,
      document_assignments (
        title,
        due_at,
        lesson_id
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error && isMissingSchemaError(error)) {
    return csvResponse("training-acknowledgements.csv", []);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return csvResponse(
    "training-acknowledgements.csv",
    (data ?? []).map((row) => {
      const assignment = unwrapJoin(row.document_assignments as
        | { title: string | null; due_at: string | null; lesson_id: string | null }
        | { title: string | null; due_at: string | null; lesson_id: string | null }[]
        | null);
      return {
        acknowledgement_id: row.id,
        user_id: row.user_id,
        status: row.status,
        acknowledged_at: row.acknowledged_at,
        note: row.acknowledgement_note,
        assignment_title: assignment?.title ?? "",
        assignment_due_at: assignment?.due_at ?? "",
        lesson_id: assignment?.lesson_id ?? "",
        created_at: row.created_at,
      };
    }),
  );
}

async function exportSignoffs(orgId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("training_signoffs")
    .select(`
      id,
      student_user_id,
      instructor_user_id,
      status,
      signoff_note,
      signed_off_at,
      created_at,
      training_lessons (
        title,
        lesson_code
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error && isMissingSchemaError(error)) {
    return csvResponse("training-signoffs.csv", []);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return csvResponse(
    "training-signoffs.csv",
    (data ?? []).map((row) => {
      const lesson = unwrapJoin(row.training_lessons as
        | { title: string | null; lesson_code: string | null }
        | { title: string | null; lesson_code: string | null }[]
        | null);
      return {
        signoff_id: row.id,
        student_user_id: row.student_user_id,
        instructor_user_id: row.instructor_user_id,
        status: row.status,
        signed_off_at: row.signed_off_at,
        note: row.signoff_note,
        lesson: lesson?.title ?? "",
        lesson_code: lesson?.lesson_code ?? "",
        created_at: row.created_at,
      };
    }),
  );
}

async function exportFormSubmissions(orgId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("training_form_submissions")
    .select(`
      id,
      submitted_by,
      student_user_id,
      lesson_id,
      status,
      submitted_at,
      created_at,
      training_forms (
        title
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error && isMissingSchemaError(error)) {
    return csvResponse("training-form-submissions.csv", []);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return csvResponse(
    "training-form-submissions.csv",
    (data ?? []).map((row) => {
      const form = unwrapJoin(row.training_forms as { title: string | null } | { title: string | null }[] | null);
      return {
        submission_id: row.id,
        form_title: form?.title ?? "",
        submitted_by: row.submitted_by,
        student_user_id: row.student_user_id,
        lesson_id: row.lesson_id,
        status: row.status,
        submitted_at: row.submitted_at,
        created_at: row.created_at,
      };
    }),
  );
}

async function exportManualVersions(orgId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("flightbook_exports")
    .select(`
      id,
      flightbook_id,
      version_number,
      change_source,
      note,
      created_at,
      markdown_storage_path,
      text_storage_path,
      flightbooks (
        name,
        doc_type,
        version_label
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error && isMissingSchemaError(error)) {
    return csvResponse("manual-version-exports.csv", []);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return csvResponse(
    "manual-version-exports.csv",
    (data ?? []).map((row) => {
      const flightbook = unwrapJoin(row.flightbooks as
        | { name: string | null; doc_type: string | null; version_label: string | null }
        | { name: string | null; doc_type: string | null; version_label: string | null }[]
        | null);
      return {
        export_id: row.id,
        flightbook_id: row.flightbook_id,
        manual_name: flightbook?.name ?? "",
        document_type: flightbook?.doc_type ?? "",
        version_label: flightbook?.version_label ?? "",
        export_version_number: row.version_number,
        change_source: row.change_source,
        note: row.note,
        markdown_storage_path: row.markdown_storage_path,
        text_storage_path: row.text_storage_path,
        created_at: row.created_at,
      };
    }),
  );
}

export async function GET(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "summary";

  if (kind === "summary") {
    return NextResponse.json(await loadSummary(ctx.orgId));
  }
  if (kind === "assignments") return exportAssignments(ctx.orgId);
  if (kind === "acknowledgements") return exportAcknowledgements(ctx.orgId);
  if (kind === "signoffs") return exportSignoffs(ctx.orgId);
  if (kind === "form-submissions") return exportFormSubmissions(ctx.orgId);
  if (kind === "manual-versions") return exportManualVersions(ctx.orgId);

  return NextResponse.json({ error: "Unsupported export kind." }, { status: 400 });
}
