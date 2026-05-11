export type CurrentOrgRole =
  | "admin"
  | "editor"
  | "compliance_manager"
  | "instructor"
  | "student"
  | "viewer";

export type ProductRole =
  | "super_admin"
  | "school_admin"
  | "compliance_manager"
  | "head_of_training"
  | "instructor"
  | "student";

export type OrganizationSummary = {
  id: string;
  name: string;
  createdAt?: string;
};

export type OrganizationMembership = {
  organizationId: string;
  userId: string;
  role: CurrentOrgRole;
  joinedAt?: string;
};

export type UserDirectoryEntry = {
  userId: string;
  role: CurrentOrgRole;
  joinedAt: string;
  email: string | null;
  lastSignIn: string | null;
  emailConfirmedAt: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  personalNotes: string | null;
  phone: string | null;
};

export type UserProfileSummary = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  personal_notes: string | null;
  phone: string | null;
  notification_email: boolean;
  notification_inapp: boolean;
  notification_digest: "immediate" | "daily" | "partial";
};

export type FlightbookSummary = {
  id: string;
  name: string;
  doc_type: string;
  version_label: string | null;
  aircraft: string | null;
  manual_group: string | null;
  effective_date: string | null;
  import_notes: string | null;
  tags: string[];
  active: boolean;
  created_at: string;
  file_ref: string | null;
  file_size_bytes: number | null;
  file_content_type: string | null;
  sectionCount: number;
  linkedLessonCount?: number;
  pendingAssignmentCount?: number;
};

export type FlightbookSectionSummary = {
  section_number: string | null;
  title: string | null;
};

export type RegulationDocumentSummary = {
  reg_number: string | null;
  part: string | null;
};

export type RegulationChangeSummary = {
  section_ref: string | null;
  change_type: string | null;
  diff_text: string | null;
  reg_documents: RegulationDocumentSummary | null;
};

export type UpdateQueueItem = {
  id: string;
  classification: string;
  risk_level: string;
  confidence_score: number | null;
  status: string;
  ai_rationale: string | null;
  created_at: string;
  updated_at?: string;
  reg_changes: RegulationChangeSummary | null;
  flightbook_sections: FlightbookSectionSummary | null;
};

export type TrainingProgrammeSummary = {
  id: string;
  organization_id: string;
  title: string;
  code: string | null;
  description: string | null;
  status: "draft" | "active" | "archived";
  created_at?: string;
  updated_at?: string;
};

export type TrainingPhaseSummary = {
  id: string;
  organization_id: string;
  programme_id: string;
  title: string;
  order_index: number;
  description: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TrainingLessonSummary = {
  id: string;
  organization_id: string;
  programme_id: string;
  phase_id: string;
  title: string;
  code: string | null;
  order_index: number;
  description: string | null;
  status: "draft" | "active" | "archived";
  created_at?: string;
  updated_at?: string;
};

export type LessonDocumentAssignment = {
  id: string;
  organization_id: string;
  lesson_id: string;
  flightbook_id: string | null;
  flightbook_section_id: string | null;
  title: string;
  document_type: string | null;
  required_for_role: ProductRole | null;
  due_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AcknowledgementRecord = {
  id: string;
  organization_id: string;
  assignment_id: string;
  user_id: string;
  acknowledged_at: string | null;
  status: "pending" | "acknowledged" | "overdue";
  created_at?: string;
  updated_at?: string;
};

export type TrainingSignoffRecord = {
  id: string;
  organization_id: string;
  lesson_id: string;
  student_user_id: string;
  instructor_user_id: string | null;
  signed_off_at: string | null;
  status: "pending" | "signed_off" | "rejected";
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TrainingFormSummary = {
  id: string;
  organization_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  status: "draft" | "active" | "archived";
  created_at?: string;
  updated_at?: string;
};

export type OrganizationBranding = {
  id: string;
  organization_id: string;
  public_name: string | null;
  legal_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  website_url: string | null;
  school_code: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  billing_contact_name: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_address: string | null;
  vat_number: string | null;
  billing_notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OnboardingChecklist = {
  id: string;
  organization_id: string;
  has_sources: boolean;
  has_ai_config: boolean;
  has_schedule: boolean;
  has_flightbooks: boolean;
  has_training_programme: boolean;
  has_assignments: boolean;
  completed_at: string | null;
  created_at?: string;
  updated_at?: string;
};
