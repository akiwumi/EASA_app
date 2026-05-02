import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type TrainingMember = {
  userId: string;
  role: string;
  displayName: string | null;
  email: string | null;
};

export type TrainingProgrammeRow = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
};

export type TrainingPhaseRow = {
  id: string;
  programme_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  active: boolean;
};

export type TrainingLessonRow = {
  id: string;
  programme_id: string;
  phase_id: string | null;
  lesson_code: string | null;
  title: string;
  description: string | null;
  lesson_type: string;
  sort_order: number;
  active: boolean;
};

export type LessonDocumentRow = {
  id: string;
  lesson_id: string;
  title: string | null;
  required: boolean;
  flightbook_id: string | null;
  flightbook_section_id: string | null;
  flightbooks?: { name: string | null } | { name: string | null }[] | null;
  flightbook_sections?:
    | { section_number: string | null; title: string | null }
    | { section_number: string | null; title: string | null }[]
    | null;
};

export type AssignmentRow = {
  id: string;
  lesson_id: string | null;
  programme_id: string | null;
  user_id: string;
  assigned_by: string | null;
  title: string;
  due_at: string | null;
  status: string;
  created_at: string;
};

export type AcknowledgementRow = {
  id: string;
  assignment_id: string;
  user_id: string;
  acknowledged_at: string | null;
  acknowledgement_note: string | null;
  status: string;
  created_at: string;
  document_assignments?:
    | { id: string; title: string; due_at: string | null; lesson_id: string | null }
    | { id: string; title: string; due_at: string | null; lesson_id: string | null }[]
    | null;
};

export type SignoffRow = {
  id: string;
  lesson_id: string | null;
  student_user_id: string;
  instructor_user_id: string | null;
  status: string;
  signoff_note: string | null;
  signed_off_at: string | null;
  created_at: string;
};

export type FlightbookOption = {
  id: string;
  name: string;
};

export type FlightbookSectionOption = {
  id: string;
  flightbook_id: string;
  section_number: string | null;
  title: string | null;
};

export function isTrainingSchemaMissingError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

export async function getTrainingPageContext() {
  const ctx = await getOrgAccessContext();
  const supabase = await getSupabaseServerClient();
  const user =
    supabase
      ? (
          await supabase.auth.getUser()
        ).data.user
      : null;

  return {
    orgId: ctx?.orgId ?? null,
    role: ctx?.role ?? null,
    userId: user?.id ?? null,
  };
}

export async function loadTrainingMembers(orgId: string): Promise<TrainingMember[]> {
  const admin = getSupabaseAdminClient();

  const { data: orgUsers, error } = await admin
    .from("org_users")
    .select("user_id, role")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error || !orgUsers?.length) return [];

  const userIds = orgUsers.map((row) => row.user_id as string);

  const [{ data: profiles }, authList] = await Promise.all([
    admin
      .from("user_profiles")
      .select("id, display_name")
      .in("id", userIds),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profileMap = new Map((profiles ?? []).map((row) => [row.id as string, row.display_name as string | null]));
  const authMap = new Map(
    (authList.data?.users ?? []).map((row) => [row.id, row.email ?? null]),
  );

  return orgUsers.map((row) => ({
    userId: row.user_id as string,
    role: String(row.role),
    displayName: profileMap.get(row.user_id as string) ?? null,
    email: authMap.get(row.user_id as string) ?? null,
  }));
}

export async function loadProgrammes(orgId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("training_programmes")
    .select("id, code, name, description, active, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error && isTrainingSchemaMissingError(error)) {
    return { schemaReady: false as const, programmes: [] as TrainingProgrammeRow[] };
  }

  return {
    schemaReady: !error,
    programmes: (data ?? []) as TrainingProgrammeRow[],
  };
}

export async function loadProgrammeDetail(orgId: string, programmeId: string) {
  const admin = getSupabaseAdminClient();

  const [{ data: programme, error: programmeError }, { data: phases, error: phasesError }, { data: lessons, error: lessonsError }] =
    await Promise.all([
      admin
        .from("training_programmes")
        .select("id, code, name, description, active, created_at")
        .eq("organization_id", orgId)
        .eq("id", programmeId)
        .maybeSingle(),
      admin
        .from("training_phases")
        .select("id, programme_id, title, description, sort_order, active")
        .eq("organization_id", orgId)
        .eq("programme_id", programmeId)
        .order("sort_order"),
      admin
        .from("training_lessons")
        .select("id, programme_id, phase_id, lesson_code, title, description, lesson_type, sort_order, active")
        .eq("organization_id", orgId)
        .eq("programme_id", programmeId)
        .order("sort_order"),
    ]);

  if ([programmeError, phasesError, lessonsError].some((error) => error && isTrainingSchemaMissingError(error))) {
    return {
      schemaReady: false as const,
      programme: null,
      phases: [] as TrainingPhaseRow[],
      lessons: [] as TrainingLessonRow[],
    };
  }

  return {
    schemaReady: !(programmeError || phasesError || lessonsError),
    programme: (programme ?? null) as TrainingProgrammeRow | null,
    phases: (phases ?? []) as TrainingPhaseRow[],
    lessons: (lessons ?? []) as TrainingLessonRow[],
  };
}

export async function loadPhaseDetail(orgId: string, phaseId: string) {
  const admin = getSupabaseAdminClient();

  const [{ data: phase, error: phaseError }, { data: lessons, error: lessonsError }] =
    await Promise.all([
      admin
        .from("training_phases")
        .select("id, programme_id, title, description, sort_order, active")
        .eq("organization_id", orgId)
        .eq("id", phaseId)
        .maybeSingle(),
      admin
        .from("training_lessons")
        .select("id, programme_id, phase_id, lesson_code, title, description, lesson_type, sort_order, active")
        .eq("organization_id", orgId)
        .eq("phase_id", phaseId)
        .order("sort_order"),
    ]);

  if ([phaseError, lessonsError].some((error) => error && isTrainingSchemaMissingError(error))) {
    return {
      schemaReady: false as const,
      phase: null,
      lessons: [] as TrainingLessonRow[],
    };
  }

  return {
    schemaReady: !(phaseError || lessonsError),
    phase: (phase ?? null) as TrainingPhaseRow | null,
    lessons: (lessons ?? []) as TrainingLessonRow[],
  };
}

export async function loadLessonDetail(orgId: string, lessonId: string) {
  const admin = getSupabaseAdminClient();

  const [
    { data: lesson, error: lessonError },
    { data: documents, error: documentsError },
    { data: flightbooks, error: flightbooksError },
    { data: sections, error: sectionsError },
  ] = await Promise.all([
    admin
      .from("training_lessons")
      .select("id, programme_id, phase_id, lesson_code, title, description, lesson_type, sort_order, active")
      .eq("organization_id", orgId)
      .eq("id", lessonId)
      .maybeSingle(),
    admin
      .from("lesson_documents")
      .select(`
        id,
        lesson_id,
        title,
        required,
        flightbook_id,
        flightbook_section_id,
        flightbooks ( name ),
        flightbook_sections ( section_number, title )
      `)
      .eq("organization_id", orgId)
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true }),
    admin
      .from("flightbooks")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("active", true)
      .order("name"),
    admin
      .from("flightbook_sections")
      .select("id, flightbook_id, section_number, title")
      .eq("organization_id", orgId)
      .order("sort_order")
      .limit(500),
  ]);

  if ([lessonError, documentsError].some((error) => error && isTrainingSchemaMissingError(error))) {
    return {
      schemaReady: false as const,
      lesson: null,
      documents: [] as LessonDocumentRow[],
      flightbooks: [] as FlightbookOption[],
      sections: [] as FlightbookSectionOption[],
    };
  }

  return {
    schemaReady: !(lessonError || documentsError || flightbooksError || sectionsError),
    lesson: (lesson ?? null) as TrainingLessonRow | null,
    documents: (documents ?? []) as LessonDocumentRow[],
    flightbooks: (flightbooks ?? []) as FlightbookOption[],
    sections: (sections ?? []) as FlightbookSectionOption[],
  };
}

export async function loadAssignments(orgId: string) {
  const admin = getSupabaseAdminClient();

  const [{ data: assignments, error: assignmentsError }, { data: lessons, error: lessonsError }, members] =
    await Promise.all([
      admin
        .from("document_assignments")
        .select("id, lesson_id, programme_id, user_id, assigned_by, title, due_at, status, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("training_lessons")
        .select("id, title, lesson_code")
        .eq("organization_id", orgId)
        .order("title"),
      loadTrainingMembers(orgId),
    ]);

  if ([assignmentsError, lessonsError].some((error) => error && isTrainingSchemaMissingError(error))) {
    return {
      schemaReady: false as const,
      assignments: [] as AssignmentRow[],
      lessons: [] as { id: string; title: string; lesson_code: string | null }[],
      members: [] as TrainingMember[],
    };
  }

  return {
    schemaReady: !(assignmentsError || lessonsError),
    assignments: (assignments ?? []) as AssignmentRow[],
    lessons: (lessons ?? []) as { id: string; title: string; lesson_code: string | null }[],
    members,
  };
}

export async function loadAcknowledgements(orgId: string, userId: string | null, role: string | null) {
  const admin = getSupabaseAdminClient();
  let query = admin
    .from("acknowledgements")
    .select(`
      id,
      assignment_id,
      user_id,
      acknowledged_at,
      acknowledgement_note,
      status,
      created_at,
      document_assignments ( id, title, due_at, lesson_id )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (role !== "admin" && role !== "editor" && role !== "instructor" && role !== "compliance_manager" && userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error && isTrainingSchemaMissingError(error)) {
    return { schemaReady: false as const, acknowledgements: [] as AcknowledgementRow[] };
  }

  return {
    schemaReady: !error,
    acknowledgements: (data ?? []) as AcknowledgementRow[],
  };
}

export async function loadSignoffs(orgId: string, userId: string | null, role: string | null) {
  const admin = getSupabaseAdminClient();

  let query = admin
    .from("training_signoffs")
    .select("id, lesson_id, student_user_id, instructor_user_id, status, signoff_note, signed_off_at, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (role !== "admin" && role !== "editor" && role !== "instructor" && role !== "compliance_manager" && userId) {
    query = query.eq("student_user_id", userId);
  }

  const [{ data: signoffs, error: signoffsError }, { data: lessons, error: lessonsError }, members] =
    await Promise.all([
      query,
      admin
        .from("training_lessons")
        .select("id, title, lesson_code")
        .eq("organization_id", orgId)
        .order("title"),
      loadTrainingMembers(orgId),
    ]);

  if ([signoffsError, lessonsError].some((error) => error && isTrainingSchemaMissingError(error))) {
    return {
      schemaReady: false as const,
      signoffs: [] as SignoffRow[],
      lessons: [] as { id: string; title: string; lesson_code: string | null }[],
      members: [] as TrainingMember[],
    };
  }

  return {
    schemaReady: !(signoffsError || lessonsError),
    signoffs: (signoffs ?? []) as SignoffRow[],
    lessons: (lessons ?? []) as { id: string; title: string; lesson_code: string | null }[],
    members,
  };
}
