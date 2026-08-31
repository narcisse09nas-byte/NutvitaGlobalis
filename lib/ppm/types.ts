// Core PPM domain types — Sprint 1 ("Architecture PPM + types + modeles + navigation").
// These four entities (Organization, Portfolio, Program, Project) are the only ones with a
// fully-specified shape in this sprint; everything else lives in stub-types.ts until its
// owning sprint builds real schema + UI against it. No Supabase table exists for any of this
// yet — Sprint 2 designs `supabase/ppm-organization-portfolio-program.sql` against these types.

export type PPMStatus = "draft" | "active" | "on_hold" | "closed" | "cancelled";

// Lightweight pointer used wherever one entity needs to reference another without embedding
// the full object — the concrete expression of the spec's "everything links to everything"
// principle at the type level.
export type PPMEntityRef = { id: string; name: string };

export type Organization = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  country?: string;
  status: PPMStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type OrgRegistryStatus = "active" | "inactive";

export type OrganizationStaff = {
  id: string;
  organization_id: string;
  code?: string | null;
  full_name: string;
  role_title?: string | null;
  email?: string | null;
  phone?: string | null;
  status: OrgRegistryStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type DonorType = "bilateral" | "multilateral" | "foundation" | "private_sector" | "individual" | "other";

export type OrganizationDonor = {
  id: string;
  organization_id: string;
  code?: string | null;
  name: string;
  donor_type?: DonorType | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  status: OrgRegistryStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationSupplier = {
  id: string;
  organization_id: string;
  code?: string | null;
  name: string;
  category?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  notes?: string | null;
  status: OrgRegistryStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type OrgUnitType = "department" | "directorate" | "field_office" | "other";

export type OrganizationUnit = {
  id: string;
  organization_id: string;
  code?: string | null;
  name: string;
  unit_type?: OrgUnitType | null;
  head_name?: string | null;
  notes?: string | null;
  status: OrgRegistryStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteAccessibility = "good" | "medium" | "poor";

export type ProjectSite = {
  id: string;
  project_id: string;
  name: string;
  accessibility?: SiteAccessibility | null;
  notes?: string | null;
  sort_order: number;
  created_at: string;
};

export type ActivityJournalCategory = "milestone" | "decision" | "issue" | "meeting" | "field_visit" | "other";

export type ActivityJournalEntry = {
  id: string;
  project_id: string;
  code?: string | null;
  entry_date: string;
  category?: ActivityJournalCategory | null;
  title: string;
  description?: string | null;
  author_name?: string | null;
  created_by?: string | null;
  created_at: string;
};

export type Portfolio = {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  description?: string;
  strategic_objectives?: string;
  // Sprint 2 pragmatism: a free-text manager name/email, not yet a real auth.users picker.
  // A proper people-directory (with PPMEntityRef-typed assignment) arrives with governance/
  // stakeholder work (sprints 6/16) — revisit this field then.
  manager_name?: string;
  manager_email?: string;
  start_date?: string;
  end_date?: string;
  countries?: string[];
  total_budget?: number;
  currency?: string;
  status: PPMStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type Program = {
  id: string;
  portfolio_id: string;
  organization_id: string;
  name: string;
  code?: string;
  description?: string;
  overall_objective?: string;
  expected_results?: string;
  manager_name?: string;
  manager_email?: string;
  donors?: string[];
  partners?: string[];
  target_population?: string;
  intervention_area?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  currency?: string;
  status: PPMStatus;
  progress_percent?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// A project may sit directly under a portfolio (program_id is optional) — common PMBOK
// practice and explicitly required by the spec (section 2: "Un projet ne doit pas
// obligatoirement appartenir a un programme").
export type ProjectType = "development" | "humanitarian" | "health" | "nutrition" | "food_security" | "research" | "other";
export type ProjectPriority = "low" | "medium" | "high" | "critical";

// Sprints 3-4: Identification + Contexte/Justification are flattened onto one row
// (supabase/ppm-project-cadrage.sql, table ppm_projects) rather than nested sub-objects —
// they are edited together on the project's Cadrage tab and never versioned independently,
// unlike the Charter below. `manager`/`sponsor`/`donor` are free-text name/email pairs for
// the same reason documented on Portfolio/Program.manager_name in Sprint 2.
export type Project = {
  id: string;
  name: string;
  code?: string;
  acronym?: string;
  short_description?: string;
  type: ProjectType;
  priority: ProjectPriority;
  portfolio_id: string;
  program_id?: string | null;
  organization_id: string;
  project_manager_name?: string;
  project_manager_email?: string;
  sponsor_name?: string;
  sponsor_email?: string;
  responsible_unit?: string;
  start_date?: string;
  end_date?: string;
  duration_months?: number;
  country?: string;
  regions?: string[];
  sites?: string[];
  target_population?: string;
  direct_beneficiaries?: number;
  indirect_beneficiaries?: number;
  donor_name?: string;
  grant_award_id?: string;
  total_budget?: number;
  currency?: string;
  // Contexte & justification (spec 7.2)
  context?: string;
  central_problem?: string;
  identified_needs?: string;
  available_data?: string;
  causes?: string;
  consequences?: string;
  justification?: string;
  opportunity?: string;
  expected_benefits?: string;
  strategic_alignment?: string;
  national_alignment?: string;
  sdgs?: string[];
  added_value?: string;
  status: PPMStatus;
  progress_percent?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// Operations Management: a parallel top-level entity alongside Project, for field operations
// that don't fit the WBS/activity model — starting with the Distribution Cycle operation type.
// `project_id` is optional ("rattache si applicable"); is_sf_hgsf gates every SF/HGSF-only
// sub-flow (menus, purchase orders, cooperatives...) throughout the module.
export type OperationProductType = "cash" | "food" | "nfi" | "other";
export type OperationActivityType = "gfd" | "ans" | "school_meal" | "other";
export type OperationStatus = "draft" | "active" | "suspended" | "closed" | "cancelled";

export type Operation = {
  id: string;
  code: string;
  organization_id: string;
  project_id?: string | null;
  name: string;
  description?: string;
  period_start: string;
  period_end: string;
  product_type: OperationProductType;
  product_type_other?: string;
  activity_type: OperationActivityType;
  activity_type_other?: string;
  is_sf_hgsf: boolean;
  currency: string;
  status: OperationStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// Operations Management: distribution site (school/community/other), scoped to one operation.
export type OpsSiteType = "school" | "health_center" | "community" | "other";
export type OpsSiteStatus = "active" | "suspended" | "closed";

export type OpsSite = {
  id: string;
  code: string;
  operation_id: string;
  linked_ppm_site_id?: string | null;
  site_type: OpsSiteType;
  name: string;
  short_initials: string;
  country: string;
  region?: string;
  division?: string;
  subdivision?: string;
  stamp_image_path?: string | null;
  // Added by supabase/ppm-ops-cadrage.sql (Wave 2) once ppm_ops_cooperatives exists.
  cooperative_id?: string | null;
  status: OpsSiteStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// Operations Management: master product catalog (8-char registry code per spec).
export type OpsProductCategory = "cash" | "food" | "nfi" | "other";

export type OpsProduct = {
  id: string;
  code: string;
  organization_id: string;
  name: string;
  category: OpsProductCategory;
  unit_of_measure: string;
  status: "active" | "inactive";
  created_at: string;
};

// Operations Management — Cadrage (Wave 2).
export type OpsSitePaymentAccountType = "mobile_money" | "bank" | "other";

export type OpsSitePaymentAccount = {
  id: string;
  site_id: string;
  account_type: OpsSitePaymentAccountType;
  account_name: string;
  account_number: string;
  provider?: string;
  is_default: boolean;
  created_at: string;
};

// "equipe de distribution" (non-SF) / COGES roster (SF) for one site.
export type OpsSiteTeamRole = "coges_president" | "coges_member" | "distribution_officer" | "delivery_team" | "other";

export type OpsSiteTeamMember = {
  id: string;
  site_id: string;
  full_name: string;
  role: OpsSiteTeamRole;
  phone?: string;
  email?: string;
  user_id?: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export type OpsRation = {
  id: string;
  operation_id: string;
  product_id: string;
  ration_per_beneficiary_per_day: number;
  unit: string;
  notes?: string;
  created_at: string;
};

export type OpsMenu = {
  id: string;
  operation_id: string;
  name: string;
  notes?: string;
  status: "active" | "inactive";
  created_at: string;
};

export type OpsMenuIngredient = {
  id: string;
  menu_id: string;
  product_id: string;
  quantity_per_child_per_day: number;
  unit: string;
  created_at: string;
};

// Append-only ingredient price history — an update never mutates an approved row (see
// IngredientPriceManager.tsx), it inserts a new pending row and supersedes the old one.
export type OpsIngredientPriceStatus = "pending" | "approved" | "superseded";

export type OpsIngredientPrice = {
  id: string;
  operation_id: string;
  product_id: string;
  unit_price: number;
  currency: string;
  status: OpsIngredientPriceStatus;
  approved_at?: string | null;
  approved_by?: string | null;
  superseded_at?: string | null;
  superseded_by_price_id?: string | null;
  effective_from: string;
  created_by?: string;
  created_at: string;
};

export type OpsCooperative = {
  id: string;
  code: string;
  organization_id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  default_payment_account_type?: OpsSitePaymentAccountType;
  default_payment_account_number?: string;
  default_payment_account_name?: string;
  stamp_image_path?: string | null;
  status: "active" | "suspended" | "closed";
  created_at: string;
};

export type OpsCooperativeContact = {
  id: string;
  cooperative_id: string;
  full_name: string;
  role?: string;
  phone?: string;
  email?: string;
  user_id?: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export type OpsSchoolCooperativeContract = {
  id: string;
  site_id: string;
  cooperative_id: string;
  start_date: string;
  end_date?: string | null;
  document_file_path?: string | null;
  status: "draft" | "active" | "expired" | "terminated";
  created_by?: string;
  created_at: string;
};

// Operations Management — Planification (Wave 3).
export type OpsAgeGroup = {
  id: string;
  operation_id: string;
  label: string;
  sort_order: number;
};

// Both the "site plan" view and the SF/HGSF "per-day menu" view are two presentations of the
// same plan record — one status field, one approval, per the spec's "l'approbation suit le
// meme workflow" requirement.
export type OpsDistributionPlanStatus = "draft" | "submitted" | "verified" | "approved" | "returned" | "rejected";

export type OpsDistributionPlan = {
  id: string;
  code: string;
  operation_id: string;
  period_start: string;
  period_end: string;
  status: OpsDistributionPlanStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type OpsDistributionPlanSite = {
  id: string;
  plan_id: string;
  site_id: string;
  target_beneficiaries: number;
  ration_days: number;
  period_start: string;
  period_end: string;
  distribution_start?: string | null;
  distribution_end?: string | null;
};

export type OpsDistributionPlanProduct = {
  id: string;
  plan_site_id: string;
  product_id: string;
  quantity_needed: number;
  unit: string;
};

// SF/HGSF only — per-day-per-school menu + target children.
export type OpsDistributionPlanDaily = {
  id: string;
  plan_site_id: string;
  ration_date: string;
  menu_id: string;
  target_children: number;
  same_for_period: boolean;
};

// Operations Management — Mise en oeuvre: non-SF path (Wave 4).
// Per-site running product balance, feeding "stock sur site" auto-fill everywhere it's needed
// (Needs, Activity Reports) — persists across operations/cycles per the confirmed decision.
export type OpsStockTransactionType = "received" | "distributed" | "damaged" | "returned" | "adjustment";

export type OpsSiteStockLedgerEntry = {
  id: number;
  site_id: string;
  product_id: string;
  transaction_type: OpsStockTransactionType;
  quantity: number;
  reference_type?: string | null;
  reference_id?: string | null;
  balance_after: number;
  recorded_at: string;
  created_by?: string;
};

export type OpsNeedStatus = "draft" | "submitted" | "verified" | "approved" | "returned" | "rejected";

export type OpsNeed = {
  id: string;
  code: string;
  plan_id: string;
  operation_id: string;
  period_start: string;
  period_end: string;
  status: OpsNeedStatus;
  created_by?: string;
  created_at: string;
};

export type OpsNeedSite = {
  id: string;
  need_id: string;
  site_id: string;
  target_beneficiaries: number;
  ration_days: number;
  desired_start_date: string;
};

export type OpsNeedProduct = {
  id: string;
  need_site_id: string;
  product_id: string;
  on_site_stock: number;
  quantity_required: number;
  quantity_needed: number;
};

// Operations Management — Mise en oeuvre: SF/HGSF path (Wave 5).
export type OpsPurchaseOrderStatus = "draft" | "submitted" | "coges_approved" | "endorsed_by_cooperative" | "returned" | "rejected" | "cancelled";

export type OpsPurchaseOrder = {
  id: string; // human PO number itself (e.g. "ECO/03/26/01"), not a uuid
  plan_id: string;
  site_id: string;
  cooperative_id: string;
  cooperative_address_snapshot?: string;
  cooperative_phone_snapshot?: string;
  cooperative_email_snapshot?: string;
  period_start: string;
  period_end: string;
  status: OpsPurchaseOrderStatus;
  endorsed_at?: string | null;
  endorsed_by_contact_id?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type OpsPoDailyLine = {
  id: string;
  po_id: string;
  ration_date: string;
  menu_id: string;
  student_count: number;
};

export type OpsPoIngredientLine = {
  id: string;
  po_id: string;
  product_id: string;
  quantity_mt: number;
  unit_price: number;
  total_price: number;
};

export type OpsDeliveryGeneratedBy = "logistics_team" | "cooperative";
export type OpsDeliveryStatus = "draft" | "submitted" | "received_pending" | "received_confirmed" | "approved" | "returned" | "rejected";

export type OpsDeliveryNote = {
  id: string; // human registry code (duplicated onto `code`) — the DB primary key is `id_pk`
  id_pk: string;
  code: string;
  need_id?: string | null;
  po_id?: string | null;
  site_id: string;
  delivery_date: string;
  delivered_by_name: string;
  generated_by: OpsDeliveryGeneratedBy;
  monetary_value?: number | null;
  currency?: string | null;
  status: OpsDeliveryStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type OpsDeliveryLine = {
  id: string;
  delivery_note_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received?: number | null;
  unit_price?: number | null;
  total_value?: number | null;
  rejected_quantity: number;
  rejection_reason?: string | null;
  conformity?: "conforme" | "non_conforme" | null;
};

export type OpsDeliveryReceiver = {
  id: string;
  delivery_note_id: string;
  full_name: string;
  role?: string | null;
  user_id?: string | null;
};

// Operations Management — Reporting & invoicing (Wave 6).
export type OpsActivityReportStatus = "draft" | "submitted" | "verified" | "approved" | "returned" | "rejected";

export type OpsActivityReport = {
  id: string;
  id_pk: string;
  site_id: string;
  delivery_note_id?: string | null;
  period_start: string;
  period_end: string;
  effective_distribution_start?: string | null;
  effective_distribution_end?: string | null;
  ration_days_provided?: number | null;
  comment?: string | null;
  amount_distributed_figures?: number | null;
  amount_distributed_currency?: string | null;
  amount_distributed_words?: string | null;
  status: OpsActivityReportStatus;
  created_by?: string;
  created_at: string;
};

export type OpsActivityReportProduct = {
  id: string;
  report_id: string;
  product_id: string;
  start_qty?: number | null;
  received_qty?: number | null;
  received_date?: string | null;
  distributed_qty?: number | null;
  damaged_qty?: number | null;
  damaged_reason?: string | null;
  returned_qty?: number | null;
  returned_reason?: string | null;
  remaining_qty?: number | null;
};

export type OpsBeneficiarySex = "male" | "female";

export type OpsActivityBeneficiary = {
  id: string;
  report_id: string;
  sex: OpsBeneficiarySex;
  age_group_id: string;
  count: number;
};

export type OpsInvoiceStatus = "draft" | "submitted" | "distribution_manager_endorsed" | "school_endorsed" | "in_synthesis" | "paid_to_school" | "paid_to_cooperative" | "rejected";

export type OpsInvoice = {
  id: string; // human invoice number itself
  delivery_note_id: string;
  site_id: string;
  cooperative_id?: string | null;
  is_sf_hgsf: boolean;
  cost_per_tonne?: number | null;
  total_tonnage?: number | null;
  amount_figures: number;
  amount_words: string;
  currency: string;
  payment_account_type?: OpsSitePaymentAccountType | null;
  payment_account_number?: string | null;
  payment_account_name?: string | null;
  status: OpsInvoiceStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// Operations Management — external cooperative/COGES portal (Wave 7).
export type OpsPartnerType = "coges" | "cooperative";
export type OpsPartnerStatus = "invited" | "active" | "suspended";

export type OpsPartnerProfile = {
  id: string;
  candidate_id: string;
  partner_type: OpsPartnerType;
  cooperative_id?: string | null;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  status: OpsPartnerStatus;
  invited_by?: string | null;
  must_change_password?: boolean;
  created_at: string;
};

export type OpsPartnerSiteLink = {
  id: string;
  partner_profile_id: string;
  site_id: string;
  role?: string | null;
};

export type OpsInvoicePaymentTracking = {
  invoice_id: string;
  cooperative_submitted_at?: string | null;
  submitted_for_payment_at?: string | null;
  paid_to_school_at?: string | null;
  paid_to_cooperative_at?: string | null;
  updated_by?: string;
  updated_at: string;
};

// Operations Management — Reconciliation et fermeture (Wave 8).
export type OpsReconciliationNoteCategory = "products" | "value" | "cooperative_payment" | "dates";

export type OpsReconciliationNote = {
  id: string;
  operation_id: string;
  category: OpsReconciliationNoteCategory;
  site_id?: string | null;
  reference_id?: string | null;
  note: string;
  created_by?: string;
  created_at: string;
};

export type OpsDonorSynthesisExport = {
  id: string;
  operation_id: string;
  period_start: string;
  period_end: string;
  prepared_by_name?: string | null;
  approved_by_name?: string | null;
  file_path?: string | null;
  generated_at: string;
  created_by?: string;
};

// Read-only rows from the computed reconciliation views (supabase/ppm-ops-reconciliation.sql).
export type OpsReconciliationProductRow = {
  report_id: string;
  report_id_pk: string;
  operation_id: string;
  site_id: string;
  site_name: string;
  product_id: string;
  product_name: string;
  period_start: string;
  period_end: string;
  start_qty: number | null;
  received_qty: number | null;
  distributed_qty: number | null;
  damaged_qty: number | null;
  returned_qty: number | null;
  remaining_qty: number | null;
  total_available: number;
  total_accounted: number;
  variance: number;
};

export type OpsReconciliationValueRow = {
  report_id: string;
  report_id_pk: string;
  operation_id: string;
  site_id: string;
  site_name: string;
  amount_distributed_figures: number | null;
  amount_distributed_currency: string | null;
  invoice_id: string | null;
  invoice_amount: number | null;
  invoice_currency: string | null;
  invoice_status: OpsInvoiceStatus | null;
  paid_to_school_at: string | null;
  variance_distributed_vs_invoiced: number;
  is_paid_to_school: boolean;
};

export type OpsReconciliationCooperativeRow = {
  invoice_id: string;
  site_id: string;
  operation_id: string;
  site_name: string;
  cooperative_id: string | null;
  cooperative_name: string | null;
  amount_figures: number;
  currency: string;
  status: OpsInvoiceStatus;
  paid_to_school_at: string | null;
  paid_to_cooperative_at: string | null;
  pending_cooperative_payment: boolean;
  anomaly_paid_cooperative_before_school: boolean;
};

export type OpsReconciliationDatesRow = {
  report_id: string;
  report_id_pk: string;
  operation_id: string;
  site_id: string;
  site_name: string;
  planned_period_start: string | null;
  planned_period_end: string | null;
  planned_distribution_start: string | null;
  planned_distribution_end: string | null;
  planned_ration_days: number | null;
  effective_distribution_start: string | null;
  effective_distribution_end: string | null;
  ration_days_provided: number | null;
  ration_days_variance: number | null;
  start_date_shifted: boolean;
  end_date_shifted: boolean;
};

// Time Table / action tracker (Wave 9 polish) — a Planner-like checklist tool listed directly
// under Operations. A list is a period-bound bucket (week or month), optionally attached to a
// project OR an operation, holding tasks each with their own responsible person and deadline.
export type PpmTaskPeriodType = "week" | "month";

export type PpmTaskList = {
  id: string;
  organization_id?: string | null;
  project_id?: string | null;
  operation_id?: string | null;
  title: string;
  period_type: PpmTaskPeriodType;
  period_start: string;
  period_end: string;
  created_by?: string;
  created_at: string;
};

export type PpmTaskStatus = "not_started" | "in_progress" | "done" | "blocked";

export type PpmTask = {
  id: string;
  task_list_id: string;
  title: string;
  description?: string | null;
  responsible_user_id?: string | null;
  responsible_name?: string | null;
  responsible_email?: string | null;
  deadline?: string | null;
  status: PpmTaskStatus;
  reminder_sent_at?: string | null;
  sort_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// Sprint 4: versioned Project Charter — a real standalone/versioned entity (table
// ppm_project_charters), unlike Identification/Context above. Draft -> Under Review ->
// Approved; once approved a charter is locked and further edits create a new version.
export type ProjectCharterStatus = "draft" | "under_review" | "approved";

export type ProjectCharter = {
  id: string;
  project_id: string;
  version: number;
  status: ProjectCharterStatus;
  purpose?: string;
  overall_objective?: string;
  specific_objectives?: string[];
  expected_results?: string;
  key_deliverables?: string[];
  high_level_scope?: string;
  indicative_budget?: number;
  timeline_summary?: string;
  initial_risks?: string;
  assumptions?: string;
  constraints?: string;
  key_stakeholders?: string;
  project_manager_authority?: string;
  governance?: string;
  success_criteria?: string;
  prepared_by_name?: string;
  reviewed_by_name?: string;
  approved_by_name?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// Sprint 5: Requirements Register (spec section 8).
export type RequirementType =
  | "contractual" | "donor" | "technical" | "functional" | "regulatory" | "quality"
  | "reporting" | "environmental" | "social" | "security" | "operational" | "other";

export type Requirement = {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  source?: string;
  source_stakeholder?: string;
  type: RequirementType;
  type_other_detail?: string | null;
  priority: ProjectPriority;
  mandatory: boolean;
  justification?: string;
  acceptance_criteria?: string;
  responsible_name?: string;
  status: PPMStatus;
  attachment_path?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// Sprint 5: Scope Statement (spec section 9) — one current statement per project; it will
// become part of the Scope Baseline once Sprint 8 adds WBS + WBS Dictionary + the
// Draft -> Review -> Approved -> Baseline workflow.
export type ScopeStatement = {
  id: string;
  project_id: string;
  in_scope?: string;
  out_of_scope?: string;
  deliverables?: string;
  acceptance_criteria?: string;
  constraints?: string;
  assumptions?: string;
  dependencies?: string;
  geographic_limits?: string;
  time_limits?: string;
  budget_limits?: string;
  change_request_id?: string | null;
  status: PPMStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// Sprint 6: Cadre de resultats (spec section 10) — Impact -> Outcome -> Output is a small
// self-referencing tree per project (parent_id), Indicators attach to any node in it.
export type ResultLevel = "impact" | "outcome" | "output";

export type ResultChainNode = {
  id: string;
  project_id: string;
  parent_id?: string | null;
  level: ResultLevel;
  title: string;
  description?: string;
  work_package_ids?: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type Indicator = {
  id: string;
  project_id: string;
  result_chain_id?: string | null;
  code?: string;
  name: string;
  definition?: string;
  unit?: string;
  baseline?: number;
  target?: number;
  current_value?: number;
  verification_source?: string;
  frequency?: string;
  responsible_name?: string;
  disaggregations?: string[];
  comments?: string;
  status: PPMStatus;
  created_at: string;
  updated_at: string;
};

// Sprint 6: Gouvernance (spec section 11) + RACI.
export type GovernanceRoleType =
  | "sponsor" | "steering_committee" | "project_director" | "project_manager" | "technical_lead"
  | "finance" | "procurement" | "meal" | "qa" | "other";

export type GovernanceRole = {
  id: string;
  project_id: string;
  role_type: GovernanceRoleType;
  role_label?: string;
  name: string;
  email?: string;
  organization?: string;
  notes?: string;
  created_at: string;
};

export type RaciType = "R" | "A" | "C" | "I";

export type RaciEntry = {
  id: string;
  project_id: string;
  area: string;
  governance_role_id: string;
  raci_type: RaciType;
  created_at: string;
};

// Sprint 7: WBS 4 niveaux + WBS Dictionary (spec sections 12-13). Codes ("1.1.1.2") are
// computed from the tree shape (see lib/ppm/wbs.ts) — never stored on the row.
export type WBSNode = {
  id: string;
  project_id: string;
  parent_id?: string | null;
  level: 1 | 2 | 3 | 4;
  title: string;
  order_index: number;
  description?: string;
  scope_included?: string;
  scope_excluded?: string;
  responsible_name?: string;
  expected_result?: string;
  deliverables?: string;
  acceptance_criteria?: string;
  estimated_duration_days?: number;
  estimated_cost?: number;
  change_request_id?: string | null;
  status: PPMStatus;
  created_at: string;
  updated_at: string;
};

// Sprint 8: Scope Baseline (spec section 14) + Change Control (spec section 24).
export type ScopeBaselineStatus = "draft" | "review" | "approved" | "baseline";

export type ScopeBaseline = {
  id: string;
  project_id: string;
  version: number;
  status: ScopeBaselineStatus;
  note?: string;
  approved_by_name?: string;
  approved_at?: string;
  change_request_id?: string | null;
  scope_snapshot?: Record<string, unknown> | null;
  wbs_snapshot?: unknown[] | null;
  dictionary_snapshot?: unknown[] | null;
  created_at: string;
  updated_at: string;
};

export type ChangeRequestStatus = "draft" | "submitted" | "impact_assessed" | "approved" | "rejected" | "implemented";

export type ChangeRequest = {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  requested_by_name?: string;
  request_code?: string | null;
  baseline_id?: string | null;
  impact_scope?: string;
  impact_schedule?: string;
  impact_budget?: string;
  impact_resources?: string;
  impact_procurement?: string;
  impact_indicators?: string;
  impact_risks?: string;
  impact_quality?: string;
  status: ChangeRequestStatus;
  decision_note?: string;
  decided_by_name?: string;
  decided_at?: string;
  created_at: string;
  updated_at: string;
};

// Sprint 9: PDM (spec section 15) — Work Package -> Activite -> Sous-activite -> Tache,
// modelled as one self-referencing table (kind + parent_id). Sprint 10's Gantt/calendrier/
// Kanban are pure views over this same data, no extra fields needed.
export type ActivityKind = "activity" | "sub_activity" | "task";
export type ActivityStatus = "not_started" | "in_progress" | "completed" | "delayed" | "blocked" | "cancelled";

export type Activity = {
  id: string;
  project_id: string;
  code?: string | null;
  work_package_id?: string | null;
  parent_id?: string | null;
  kind: ActivityKind;
  title: string;
  description?: string;
  output_id?: string | null;
  output_ids?: string[];
  responsible_name?: string;
  responsible_email?: string;
  ev_method: EvMethod;
  milestone_weights: MilestoneWeight[];
  co_responsible?: string[];
  location?: string;
  site_id?: string | null;
  dependency_ids?: string[];
  dependency_type?: 'FS' | 'SS' | 'FF' | 'SF';
  dependency_lag_days?: number;
  target_population?: string;
  beneficiaries?: number;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  is_milestone: boolean;
  planned_budget?: number;
  actual_expense?: number;
  progress_percent?: number;
  status: ActivityStatus;
  indicator_id?: string | null;
  indicator_ids?: string[];
  target_value?: string;
  deliverable?: string;
  evidence_path?: string;
  risk_note?: string;
  comment?: string;
  delay_reason?: string;
  corrective_action?: string;
  new_deadline?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

// Sprint 11: Budget (spec section 16) — Bailleur -> Grant -> Projet -> Composante (WBS) ->
// Activite -> Ligne budgetaire. Balance/burn-rate/variance are computed in the UI, not stored.
export type BudgetLine = {
  id: string;
  project_id: string;
  wbs_node_id?: string | null;
  activity_id?: string | null;
  wbs_allocations?: { work_package_id: string; percentage: number }[];
  cost_center_id?: string | null;
  cost_category?: string;
  sub_category?: string;
  budget_category_id?: string | null;
  donor_name?: string;
  donor_id?: string | null;
  grant_reference?: string;
  grant_id?: string | null;
  description: string;
  initial_budget: number;
  revised_budget?: number;
  committed_amount: number;
  spent_amount: number;
  forecast_amount?: number;
  currency?: string;
  exchange_rate?: number;
  period_start?: string;
  period_end?: string;
  status: 'draft' | 'submitted' | 'verified' | 'approved' | 'returned' | 'rejected' | 'cancelled';
  submitted_at?: string | null;
  verified_at?: string | null;
  verified_by_name?: string | null;
  approved_at?: string | null;
  approved_by_name?: string | null;
  workflow_note?: string | null;
  created_at: string;
  updated_at: string;
};

// Sprint 12: Resource management (spec section 22).
export type ResourceType = "human" | "consultant" | "equipment" | "vehicle" | "infrastructure" | "service" | "consumable" | "material" | "other";
export type ResourceCostUnit = "hour" | "day" | "week" | "month" | "flat";
export type ResourceOriginType = "purchase" | "donation" | "transfer" | "internal_production" | "other";

export type PPMResource = {
  id: string;
  project_id: string;
  type: ResourceType;
  type_other_detail?: string | null;
  name: string;
  role_title?: string;
  skills?: string[];
  availability_percent?: number;
  weekly_capacity_hours?: number;
  cost_rate?: number;
  cost_unit?: ResourceCostUnit;
  currency?: string;
  condition_notes?: string;
  status: PPMStatus;
  asset_workflow_status?: ApprovalWorkflowStatus;
  notes?: string;
  // Refinement program, Wave 9: per-module workflow permissions + auto-provisioned access account.
  permissions?: Record<string, { submit?: boolean; verify?: boolean; approve?: boolean }>;
  user_id?: string | null;
  account_email?: string | null;
  // Project Asset Management: origin tracking for equipment/vehicle/infrastructure resources.
  // origin_type is null for a mere planning placeholder; set once the asset is concretely
  // registered (asset_code assigned).
  asset_code?: string | null;
  origin_type?: ResourceOriginType | null;
  origin_procurement_item_id?: string | null;
  origin_donor_name?: string | null;
  origin_transfer_project_id?: string | null;
  origin_other_detail?: string | null;
  origin_notes?: string | null;
  current_location?: string | null;
  registered_at?: string | null;
  registered_by?: string | null;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
};

export type ResourceAssignment = {
  id: string;
  project_id: string;
  resource_id: string;
  activity_id?: string | null;
  wbs_node_id?: string | null;
  allocation_percent?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_at: string;
};

// Sprint 13: Procurement (spec section 17) — one row per item, moving through `stage`.
export type ProcurementCategory = "goods" | "works" | "services" | "consultancy";
export type ProcurementMethod = "direct" | "rfq" | "rfp" | "tender";
export type ProcurementStage =
  | "need" | "request" | "package" | "solicitation" | "evaluation" | "award" | "contract"
  | "delivery" | "receipt" | "invoice" | "payment" | "completed" | "cancelled";
export type ProcurementPaymentStatus = "not_invoiced" | "invoiced" | "partially_paid" | "paid";

export type ProcurementAcceptanceCriterion = { id: string; title: string; specification: string };
export type ProcurementOrderedItem = { id: string; title: string; specification?: string; quantity: number; unit?: string };
export type ProcurementReceiptStatus = "pending_delivery" | "partial" | "complete" | "received_with_reservations" | "rejected" | "returned_to_supplier" | "closed_with_cancelled_balance";

export type ProcurementItem = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  activity_id?: string | null;
  budget_line_id?: string | null;
  cost_center_id?: string | null;
  supplier_id?: string | null;
  contract_id?: string | null;
  title: string;
  description?: string;
  category: ProcurementCategory;
  procurement_method: ProcurementMethod;
  estimated_value?: number;
  currency?: string;
  stage: ProcurementStage;
  requested_by_name?: string;
  request_code?: string | null;
  baseline_id?: string | null;
  requested_by_email?: string;
  supplier_name?: string;
  contract_reference?: string;
  po_reference?: string;
  acceptance_criteria?: ProcurementAcceptanceCriterion[];
  ordered_items?: ProcurementOrderedItem[];
  receipt_status?: ProcurementReceiptStatus;
  awarded_amount?: number;
  delivery_date?: string;
  received_date?: string;
  invoice_reference?: string;
  payment_status: ProcurementPaymentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
};

// Sprint 14: Quality management (spec section 18). Execution add-on Phase H adds
// "non_applicable" plus a checklist + score (spec section 22).
export type QualityResult = "pending" | "conforme" | "non_conforme" | "non_applicable";

export type QualityChecklistItem = { id?: string; criterion: string; description?: string; control_method?: string; result: QualityResult; comment?: string };
export type QualityStandard = { id: string; description: string; control_method: string; control_method_other?: string };
export type ApprovalWorkflowStatus = "draft" | "submitted" | "verified" | "approved" | "returned" | "rejected";

export type QualityRequirement = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  activity_id?: string | null;
  title: string;
  requirement_code?: string | null;
  standard_reference?: string;
  standards?: QualityStandard[];
  workflow_status?: ApprovalWorkflowStatus;
  control_state?: "open" | "closed_compliant";
  description?: string;
  control_method?: string;
  frequency?: string;
  responsible_name?: string;
  control_date?: string;
  result: QualityResult;
  checklist: QualityChecklistItem[];
  score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type QualityEvidenceCategory = "report" | "photo" | "checklist" | "video" | "document" | "other";

export type QualityEvidence = {
  id: string;
  quality_requirement_id?: string | null;
  quality_control_actual_id?: string | null;
  title: string;
  category: QualityEvidenceCategory;
  file_path?: string;
  description?: string;
  uploaded_by_name?: string;
  created_at: string;
};

// Refinement program, Wave 6: Quality control ACTUALS are their own rows — one per time a
// planned control (QualityRequirement, now purely the plan) is actually performed.
export type QualityControlActual = {
  id: string;
  project_id: string;
  quality_requirement_id: string;
  control_code?: string | null;
  control_date?: string;
  result: QualityResult;
  checklist: QualityChecklistItem[];
  score?: number;
  notes?: string;
  created_by?: string | null;
  created_at: string;
};

export type NcrStatus = "open" | "root_cause_identified" | "capa_planned" | "capa_implemented" | "effectiveness_reviewed" | "closed";

export type NonConformityReport = {
  id: string;
  project_id: string;
  quality_requirement_id?: string | null;
  title: string;
  description?: string;
  root_cause?: string;
  capa_action?: string;
  capa_responsible?: string;
  capa_deadline?: string;
  effectiveness_review?: string;
  status: NcrStatus;
  created_at: string;
  updated_at: string;
};

// Sprint 15: Risk Register + Issues (spec section 19) — kept as two separate entities.
export type RiskResponseStrategy = "avoid" | "mitigate" | "transfer" | "accept";
export type RiskStatus = "open" | "monitoring" | "closed";

export type Risk = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  code?: string;
  title: string;
  category?: string;
  cause?: string;
  event?: string;
  consequence?: string;
  probability: number;
  impact: number;
  owner_name?: string;
  response_strategy?: RiskResponseStrategy;
  mitigation_plan?: string;
  deadline?: string;
  cost?: number;
  currency?: string;
  residual_probability?: number;
  residual_impact?: number;
  status: RiskStatus;
  created_at: string;
  updated_at: string;
};

// Refinement program, Wave 6: periodic Risk reviews (item 35) — full history of re-assessments
// instead of only the risk's current probability/impact/status snapshot.
export type RiskReview = {
  id: string;
  project_id: string;
  risk_id: string;
  review_date: string;
  reviewer_name?: string;
  probability: number;
  impact: number;
  status_after: RiskStatus;
  response_strategy?: RiskResponseStrategy | null;
  owner_name?: string | null;
  action?: string | null;
  notes?: string;
  created_by?: string | null;
  created_at: string;
};

export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export type IssueReview = {
  id: string; project_id: string; issue_id: string; review_date: string; reviewer_name?: string | null;
  priority: ProjectPriority; owner_name?: string | null; due_date?: string | null; status_after: IssueStatus;
  action?: string | null; notes?: string | null; created_by?: string | null; created_at: string;
};

export type Issue = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  activity_id?: string | null;
  issue_code?: string | null;
  title: string;
  description?: string;
  category?: string;
  raised_by_name?: string;
  priority: ProjectPriority;
  owner_name?: string;
  resolution_plan?: string;
  due_date?: string;
  cost?: number | null;
  currency?: string;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
};

// Sprint 16: Stakeholder register + Communication plan (spec sections 20-21).
export type StakeholderCategory = "internal" | "external" | "donor" | "beneficiary" | "government" | "partner" | "community" | "other";
export type StakeholderLevel = "low" | "medium" | "high";
export type StakeholderPosition = "champion" | "supporter" | "neutral" | "critic" | "blocker";

export type Stakeholder = {
  id: string;
  project_id: string;
  stakeholder_code?: string | null;
  name: string;
  organization?: string;
  role_title?: string;
  category: StakeholderCategory;
  influence_level: StakeholderLevel;
  interest_level: StakeholderLevel;
  position: StakeholderPosition;
  desired_position?: StakeholderPosition | null;
  contact_email?: string;
  contact_phone?: string;
  engagement_strategy?: string;
  engagement_strategies?: string[];
  notes?: string;
  status: PPMStatus;
  created_at: string;
  updated_at: string;
};

export type CommunicationChannel = "email" | "meeting" | "report" | "sms" | "radio" | "phone" | "other";
export type CommunicationStatus = "planned" | "sent" | "done" | "cancelled";

export type CommunicationItem = {
  id: string;
  project_id: string;
  communication_code?: string | null;
  stakeholder_id?: string | null;
  stakeholder_ids?: string[];
  audience?: string;
  topic: string;
  message?: string;
  channel: CommunicationChannel;
  frequency?: string;
  responsible_name?: string;
  next_date?: string;
  last_sent_date?: string;
  status: CommunicationStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
};

// Sprint 17: MEAL — Monitoring, Evaluation, Accountability, Learning (spec section 23).
// Execution add-on Phase F adds the validation workflow (status onward) — only a validated
// entry may update Indicator.current_value (spec section 25).
export type MealEntryStatus = "draft" | "submitted" | "data_quality_review" | "validated" | "returned" | "rejected";

export type MealEntry = {
  id: string;
  project_id: string;
  indicator_id: string;
  period_label: string;
  period_start?: string;
  period_end?: string;
  target_value?: number;
  actual_value?: number;
  data_source?: string;
  collected_by_name?: string;
  collection_date?: string;
  comments?: string;
  status: MealEntryStatus;
  reviewed_by_name?: string;
  review_note?: string;
  reviewed_at?: string;
  validated_at?: string;
  created_at: string;
  updated_at: string;
};

export type EvaluationType = "baseline" | "midline" | "endline" | "final" | "ex_post";
export type EvaluationStatus = "planned" | "ongoing" | "completed" | "cancelled";

export type Evaluation = {
  id: string;
  project_id: string;
  type: EvaluationType;
  title: string;
  planned_date?: string;
  actual_date?: string;
  methodology?: string;
  key_findings?: string;
  recommendations?: string;
  status: EvaluationStatus;
  report_path?: string;
  created_at: string;
  updated_at: string;
};

export type FeedbackCategory = "complaint" | "suggestion" | "feedback" | "question";
export type FeedbackStatus = "received" | "under_review" | "resolved" | "closed";

export type FeedbackEntry = {
  id: string;
  project_id: string;
  source_name?: string;
  category: FeedbackCategory;
  channel?: string;
  description: string;
  is_sensitive: boolean;
  status: FeedbackStatus;
  response?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
};

// Refinement program, Wave 7 (item 42): closed feedback gets its own follow-up review register
// with history, instead of only a single status field.
export type FeedbackFollowup = {
  id: string;
  project_id: string;
  feedback_id: string;
  review_date: string;
  reviewer_name?: string;
  action_taken?: string;
  status_after: FeedbackStatus;
  notes?: string;
  created_by?: string | null;
  created_at: string;
};

export type LessonLearned = {
  id: string;
  project_id: string;
  category?: string;
  context?: string;
  description: string;
  recommendation?: string;
  created_by_name?: string;
  created_at: string;
};

// Sprint 18: Deliverables + Document management (spec sections 24-25).
export type DeliverableType = "report" | "product" | "infrastructure" | "training" | "service" | "other";
// Execution add-on Phase G widens this to match spec section 26: DRAFT(pending) -> SUBMITTED ->
// QUALITY CHECK -> ACCEPTED, with REJECTED / RETURNED FOR REVISION branches.
export type DeliverableAcceptanceStatus = "pending" | "submitted" | "quality_check" | "accepted" | "rejected" | "returned_for_revision";

export type Deliverable = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  activity_id?: string | null;
  issue_code?: string | null;
  title: string;
  description?: string;
  category?: string;
  type: DeliverableType;
  responsible_name?: string;
  planned_date?: string;
  actual_date?: string;
  acceptance_criteria?: string | null;
  acceptance_status: DeliverableAcceptanceStatus;
  accepted_by_name?: string;
  accepted_at?: string;
  file_path?: string;
  version: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type DocumentCategory = "contract" | "report" | "technical" | "administrative" | "communication" | "financial" | "other";
export type DocumentConfidentiality = "public" | "internal" | "confidential";
export type DocumentStatus = "draft" | "final" | "archived";

export type PPMDocument = {
  id: string;
  project_id: string;
  deliverable_id?: string | null;
  deliverable_ids?: string[];
  work_package_id?: string | null;
  title: string;
  category: DocumentCategory;
  description?: string;
  version: number;
  file_path?: string;
  confidentiality: DocumentConfidentiality;
  status: DocumentStatus;
  uploaded_by_name?: string;
  created_at: string;
  updated_at: string;
};

// Sprint 19: Reporting engine (spec section 26).
export type ReportType = "weekly" | "monthly" | "quarterly" | "donor" | "steering_committee" | "final" | "custom";
export type ReportStatus = "draft" | "final" | "submitted";

export type Report = {
  id: string;
  project_id: string;
  type: ReportType;
  title: string;
  period_start?: string;
  period_end?: string;
  summary?: string;
  achievements?: string;
  challenges?: string;
  next_steps?: string;
  financial_summary?: string;
  generated_by_name?: string;
  status: ReportStatus;
  file_path?: string;
  created_at: string;
  updated_at: string;
};

// Sprint 21: Notifications + Approval workflows (spec section 27).
export type NotificationCategory = "info" | "approval" | "alert" | "reminder";

export type PPMNotification = {
  id: string;
  user_id?: string | null;
  recipient_email?: string | null;
  project_id?: string | null;
  category: NotificationCategory;
  title: string;
  message?: string;
  link?: string;
  read_at?: string | null;
  created_at: string;
};

export type ApprovalEntityType = "charter" | "scope_baseline" | "change_request" | "deliverable" | "ncr" | "report" | "other";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalRequest = {
  id: string;
  project_id: string;
  code?: string | null;
  entity_type: ApprovalEntityType;
  entity_id?: string | null;
  entity_label?: string;
  title: string;
  description?: string;
  requested_by_name?: string;
  request_code?: string | null;
  baseline_id?: string | null;
  requested_by_email?: string;
  approver_name?: string;
  approver_email?: string;
  status: ApprovalStatus;
  decision_note?: string;
  decided_by_name?: string;
  decided_at?: string;
  created_at: string;
  updated_at: string;
};

// Refinement program, Wave 8: a real directory of people outside the project who approve
// deliverables/documents (item 43) — feeds the approver dropdown above and the "accepted by"
// dropdown on Deliverables.
export type ExternalApprover = {
  id: string;
  project_id: string;
  name: string;
  email: string;
  organization?: string;
  role_title?: string;
  notes?: string;
  created_by?: string | null;
  created_at: string;
};

export type HandoverStatus = "pending" | "handed_over" | "acknowledged";
export type DisposalMethod = "transferred_to_project" | "donated" | "sold" | "scrapped" | "returned_to_donor" | "kept_by_organization" | "other";

export type HandoverItem = {
  id: string;
  project_id: string;
  code?: string | null;
  title: string;
  description?: string;
  recipient_name?: string;
  recipient_organization?: string;
  handover_date?: string;
  status: HandoverStatus;
  file_path?: string;
  notes?: string;
  resource_id?: string | null;
  disposal_method?: DisposalMethod | null;
  disposal_method_other?: string | null;
  disposal_amount?: number | null;
  disposal_currency?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ArchiveSourceType = "deliverable" | "document" | "other";

export type ArchiveItem = {
  id: string;
  project_id: string;
  code?: string | null;
  title: string;
  source_type: ArchiveSourceType;
  source_id?: string | null;
  file_path?: string;
  notes?: string;
  created_by?: string | null;
  created_at: string;
};

// Sprint 22: Audit Trail — reads public.ppm_history, populated since Sprint 2 by every
// status-changing action across the app (project creation, charter/baseline/change-request
// decisions, etc.). `actor_id` is a bare auth.users id: this app has no general people
// directory, so the UI can only tell "you" from "someone else" — see AuditTrailFeed.tsx.
export type AuditEntityType =
  | "organization" | "portfolio" | "program" | "project"
  | "distribution_operation" | "distribution_site" | "ingredient_price" | "distribution_plan"
  | "distribution_need" | "purchase_order" | "delivery_note" | "activity_report" | "invoice" | "partner_profile"
  | "asset" | "asset_assignment" | "asset_inventory_session";

export type AuditLogEntry = {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  actor_id?: string | null;
  action: string;
  from_status?: string;
  to_status?: string;
  note?: string;
  created_at: string;
};

// Sprint 23: Project closure workflow.
export type ProjectClosureStatus = "draft" | "in_progress" | "completed";

export type ProjectClosure = {
  id: string;
  project_id: string;
  scope_verified: boolean;
  scope_verification_note?: string;
  procurement_closed: boolean;
  procurement_closure_note?: string;
  financial_closed: boolean;
  financial_closure_note?: string;
  final_evaluation_id?: string | null;
  handover_to_name?: string;
  handover_to_organization?: string;
  handover_date?: string;
  handover_notes?: string;
  archive_reference?: string;
  status: ProjectClosureStatus;
  closed_by_name?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
};

// Execution add-on (Phase A+B): Planned / Reported / Validated Actual architecture, applied
// first to PDM activities. Achievement is the Reported/Validated-Actual counterpart to an
// Activity — never confused with it. Full lifecycle exists now so Phase C (validation/review)
// needs no new migration; this phase's UI only exercises draft -> submitted.
export type AchievementType =
  | "training" | "sensitization" | "distribution" | "supervision" | "meeting" | "mission"
  | "data_collection" | "service_delivery" | "construction" | "documentation" | "other";
export type ProgressMethod = "quantitative" | "milestones" | "manual";
export type DifficultyCategory =
  | "technical" | "logistics" | "financial" | "hr" | "procurement" | "security"
  | "partner" | "community" | "environment" | "weather" | "other";
export type DifficultySeverity = "low" | "medium" | "high" | "critical";
export type AchievementStatus = "draft" | "submitted" | "under_review" | "validated" | "returned" | "rejected" | "cancelled";

export type BeneficiaryBreakdownEntry = { category: string; label: string; value: number };

export type Achievement = {
  id: string;
  project_id: string;
  activity_id: string;
  code?: string;
  period_label?: string;
  reporting_period_start?: string;
  reporting_period_end?: string;
  achievement_date?: string;
  location?: string;
  title: string;
  description?: string;
  achievement_type?: AchievementType;
  actual_start?: string;
  actual_end?: string;
  partners_involved?: string;
  progress_method: ProgressMethod;
  target_value?: number;
  previous_validated_cumulative?: number;
  period_achieved?: number;
  proposed_cumulative?: number;
  milestones_planned?: number;
  milestones_completed?: number;
  manual_progress_percent?: number;
  manual_justification?: string;
  progress_percent?: number;
  beneficiaries_period?: number;
  beneficiaries_cumulative?: number;
  beneficiaries_breakdown: BeneficiaryBreakdownEntry[];
  indicator_id?: string | null;
  indicator_contribution?: number;
  indicator_contribution_note?: string;
  difficulty_encountered: boolean;
  difficulty_category?: DifficultyCategory;
  difficulty_description?: string;
  difficulty_severity?: DifficultySeverity;
  difficulty_cause?: string;
  difficulty_impact?: string;
  variance_note?: string;
  corrective_action?: string;
  corrective_action_responsible?: string;
  corrective_action_deadline?: string;
  support_required?: string;
  linked_issue_id?: string | null;
  linked_risk_id?: string | null;
  next_steps?: string;
  next_steps_responsible?: string;
  next_steps_deadline?: string;
  next_steps_support?: string;
  management_decision_required: boolean;
  management_decision_requested?: string;
  management_decision_authority?: string;
  management_decision_deadline?: string;
  status: AchievementStatus;
  submitted_at?: string;
  reviewed_by_name?: string;
  review_note?: string;
  reviewed_at?: string;
  validated_at?: string;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
};

export type EvidenceCategory = "report" | "photo" | "attendance_list" | "minutes" | "dataset" | "form" | "gps" | "video" | "document" | "url" | "other";

export type AchievementEvidence = {
  id: string;
  achievement_id: string;
  title: string;
  category: EvidenceCategory;
  file_path?: string;
  external_url?: string;
  evidence_date?: string;
  location?: string;
  description?: string;
  uploaded_by_name?: string;
  created_at: string;
};

// "Who is responsible" stays free-text everywhere in this app (no user-account directory) —
// this is the dropdown-source shape assembled from names/emails already entered on this
// project (governance roles, project manager/sponsor, existing activity responsibles).
export type KnownPerson = { name: string; email?: string };

// Execution add-on Phase D: Expenses + financial workflow (spec sections 12-19).
// Commitments are not modelled separately here — a linked ProcurementItem.awarded_amount
// (Sprint 13) already IS the commitment; see procurement_item_id below.
export type ExpenseCategory =
  | "personnel" | "consultants" | "travel" | "transport" | "accommodation" | "training"
  | "workshop" | "supplies" | "equipment" | "communication" | "services" | "other";
export type PaymentMethod = "cash" | "bank_transfer" | "check" | "mobile_money" | "card" | "other";
export type ExpenseStatus = "draft" | "submitted" | "finance_review" | "manager_approval" | "posted" | "returned" | "rejected" | "cancelled";

export type CostCenterStatus = "active" | "inactive" | "archived";
export type ProjectFinanceSettings = { project_id: string; cost_centers_enabled: boolean; cost_center_required: boolean; updated_at: string };
export type CostCenter = { id: string; project_id: string; code: string; label: string; responsible_name?: string | null; status: CostCenterStatus; is_default: boolean; created_at: string; updated_at: string };
export type ProjectContract = { id: string; project_id: string; contract_number: string; title?: string | null; party_type: "supplier" | "staff" | "other"; party_id?: string | null; party_name: string; start_date?: string | null; end_date?: string | null; amount?: number | null; currency?: string | null; status: "draft" | "active" | "expired" | "terminated" | "archived"; notes?: string | null; created_at: string; updated_at: string };
export type ExpenseWorkPackageAllocation = { work_package_id: string; percentage: number; amount: number };

export type Expense = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  activity_id?: string | null;
  work_package_allocations?: ExpenseWorkPackageAllocation[];
  budget_line_id?: string | null;
  procurement_item_id?: string | null;
  code?: string;
  donor_name?: string;
  donor_id?: string | null;
  grant_reference?: string;
  grant_id?: string | null;
  cost_center?: string;
  cost_center_id?: string | null;
  expense_date?: string;
  category?: ExpenseCategory;
  sub_category?: string;
  description: string;
  justification?: string;
  payee_name?: string;
  payee_type?: "supplier" | "staff" | "other";
  payee_id?: string | null;
  location?: string;
  amount_excl_tax: number;
  tax_amount?: number;
  amount_incl_tax: number;
  transaction_currency?: string;
  project_currency?: string;
  exchange_rate?: number;
  converted_amount?: number;
  payment_method?: PaymentMethod;
  payment_account_reference?: string;
  payment_date?: string;
  transaction_reference?: string;
  invoice_number?: string;
  invoice_date?: string;
  po_reference?: string;
  contract_reference?: string;
  contract_id?: string | null;
  supplier_name?: string;
  payment_override_requested?: boolean;
  payment_override_reason?: string;
  payment_override_approved?: boolean;
  payment_override_approved_by?: string;
  payment_override_approved_at?: string;
  status: ExpenseStatus;
  over_budget_justification?: string;
  submitted_at?: string;
  finance_reviewed_by_name?: string;
  finance_review_note?: string;
  finance_reviewed_at?: string;
  approved_by_name?: string;
  approval_note?: string;
  approved_at?: string;
  posted_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseEvidenceCategory =
  | "invoice" | "purchase_order" | "contract" | "delivery_note" | "receipt_note"
  | "mission_order" | "ticket" | "mission_report" | "liquidation" | "other";

export type ExpenseEvidence = {
  id: string;
  expense_id: string;
  title: string;
  category: ExpenseEvidenceCategory;
  file_path?: string;
  description?: string;
  uploaded_by_name?: string;
  created_at: string;
};

// Execution add-on Phase I: Procurement Actuals — "Enregistrer une reception" (spec section 24).
export type ReceiptQualityAssessment = "conforme" | "non_conforme" | "partiellement_conforme";

export type ProcurementReceipt = {
  id: string;
  project_id: string;
  procurement_item_id: string;
  receipt_number?: string;
  receipt_type?: "goods" | "services" | "works" | "consultancy" | "rental" | "training";
  status: ProcurementReceiptStatus;
  supplier_name?: string;
  receipt_date?: string;
  site?: string;
  item_description?: string;
  quantity_ordered?: number;
  previous_quantity?: number;
  current_quantity?: number;
  remaining_quantity?: number;
  quantity_delivered?: number;
  quantity_accepted?: number;
  quantity_rejected?: number;
  rejection_reason?: string;
  quality_assessment?: ReceiptQualityAssessment;
  inspection_notes?: string;
  anomalies?: string;
  evidence_requirement?: string;
  create_asset?: boolean;
  asset_resource_id?: string | null;
  delivery_note_number?: string;
  receipt_minutes_reference?: string;
  received_by_name?: string;
  created_at: string;
};

export type ProcurementReceiptLine = { id: string; receipt_id: string; item_code: string; title: string; specification?: string; quantity_ordered: number; quantity_previous: number; quantity_received: number; quantity_remaining: number; quality_condition?: string; accepted: boolean; notes?: string };
export type ProcurementReceiptCriterion = { id: string; receipt_id: string; criterion_code: string; title: string; specification?: string; result: "pending" | "compliant" | "non_compliant" | "not_applicable"; observation?: string };
export type ReceiptCommitteeMember = { id: string; receipt_id: string; resource_id?: string | null; member_name: string; member_email?: string; decision: "pending" | "approved" | "rejected"; decision_note?: string; signed_at?: string };
export type ProcurementReceiptEvidenceCategory = "photo" | "delivery_note" | "receipt_minutes" | "report" | "invoice" | "service_certificate" | "validated_deliverable" | "attendance_list" | "utilization_sheet" | "other";

export type ProcurementReceiptEvidence = {
  id: string;
  receipt_id: string;
  title: string;
  category: ProcurementReceiptEvidenceCategory;
  file_path?: string;
  created_at: string;
};

// Execution add-on Phase J: Resource Actuals — Timesheets + Equipment checkouts (spec section 23).
export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export type Timesheet = {
  id: string;
  project_id: string;
  resource_id?: string | null;
  work_package_id?: string | null;
  activity_id?: string | null;
  entry_date: string;
  hours: number;
  days?: number | null;
  week_start?: string | null;
  end_date?: string | null;
  duration?: number | null;
  duration_unit?: 'hour' | 'day' | 'week' | 'month' | null;
  description?: string;
  status: TimesheetStatus;
  approved_by_name?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type AssetInventorySessionStatus = "draft" | "in_progress" | "completed" | "cancelled";

export type AssetInventorySession = {
  id: string;
  project_id: string;
  code?: string | null;
  title: string;
  count_date: string;
  status: AssetInventorySessionStatus;
  conducted_by_name?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

export type AssetInventoryCountStatus = "pending" | "found" | "not_found" | "misplaced";

export type AssetInventoryLine = {
  id: string;
  session_id: string;
  resource_id: string;
  count_status: AssetInventoryCountStatus;
  condition_observed?: string | null;
  location_observed?: string | null;
  discrepancy_note?: string | null;
  counted_by_name?: string | null;
  counted_at?: string | null;
  created_at: string;
};

export type EquipmentCheckoutStatus = "pending_endorsement" | "checked_out" | "return_requested" | "returned" | "lost" | "damaged";

export type EquipmentCheckout = {
  id: string;
  project_id: string;
  resource_id: string;
  assignment_code?: string | null;
  workflow_status?: ApprovalWorkflowStatus;
  activity_id?: string | null;
  user_name?: string;
  assigned_resource_id?: string | null;
  assigned_by?: string | null;
  endorsed_at?: string | null;
  return_requested_at?: string | null;
  return_requested_note?: string | null;
  return_endorsed_at?: string | null;
  return_endorsed_by?: string | null;
  checkout_date?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  condition_out?: string;
  condition_in?: string;
  incident_note?: string;
  status: EquipmentCheckoutStatus;
  created_at: string;
};

// Execution add-on Phase K: Communication Actuals + Stakeholder Interactions (spec sections 20-21).
export type CommunicationActualStatus = "draft" | "submitted" | "verified" | "approved" | "returned" | "rejected";

export type CommunicationActual = {
  id: string;
  project_id: string;
  communication_item_id?: string | null;
  actual_code?: string | null;
  planned_date?: string;
  actual_date?: string;
  stakeholders?: string;
  participants?: string;
  channel?: string;
  subject: string;
  agenda?: string;
  beneficiary_count?: number | null;
  key_messages?: string;
  information_shared?: string;
  feedback_received?: string;
  decisions?: string;
  actions?: string;
  responsible_name?: string;
  deadline?: string;
  minutes_reference?: string;
  status: CommunicationActualStatus;
  created_at: string;
  updated_at: string;
};

export type StakeholderPositionChangeStatus = "not_proposed" | "proposed" | "approved" | "rejected";

export type StakeholderInteraction = {
  id: string;
  project_id: string;
  stakeholder_id: string;
  stakeholder_ids?: string[];
  interaction_code?: string | null;
  interaction_date?: string;
  interaction_type?: string;
  interaction_type_other?: string | null;
  participants?: string;
  objective?: string;
  topics_discussed?: string;
  concerns?: string;
  expectations?: string;
  engagement_observed?: string;
  decisions?: string;
  actions?: string;
  responsible_name?: string;
  deadline?: string;
  proposed_influence_level?: StakeholderLevel;
  proposed_interest_level?: StakeholderLevel;
  proposed_position?: StakeholderPosition;
  position_change_status: StakeholderPositionChangeStatus;
  created_at: string;
  updated_at: string;
};

export type StakeholderReview = { id:string; project_id:string; stakeholder_id:string; review_date:string; reviewer_name?:string|null; influence_level:StakeholderLevel; interest_level:StakeholderLevel; position:StakeholderPosition; status:PPMStatus; engagement_strategies:string[]; notes?:string|null; created_at:string };
export type CommunicationPlanReview = { id:string; project_id:string; communication_item_id:string; review_date:string; reviewer_name?:string|null; responsible_name?:string|null; status:CommunicationStatus; next_date?:string|null; last_sent_date?:string|null; notes?:string|null; created_at:string };
export type StakeholderInteractionReview = { id:string; project_id:string; interaction_id:string; review_date:string; reviewer_name?:string|null; proposed_position?:StakeholderPosition|null; proposed_influence_level?:StakeholderLevel|null; proposed_interest_level?:StakeholderLevel|null; position_change_status?:StakeholderPositionChangeStatus|null; approval_date?:string|null; notes?:string|null; created_at:string };
export type CommunicationActionStatus = "open"|"in_progress"|"completed"|"cancelled";
export type CommunicationAction = { id:string; project_id:string; action_code?:string|null; source_type:"direct"|"communication_actual"|"stakeholder_interaction"; source_id?:string|null; title:string; responsible_name?:string|null; due_date?:string|null; status:CommunicationActionStatus; created_at:string; updated_at:string };
export type CommunicationActionReview = { id:string; project_id:string; action_id:string; review_date:string; reviewer_name?:string|null; responsible_name?:string|null; due_date?:string|null; status:CommunicationActionStatus; notes?:string|null; created_at:string };
// Execution add-on Phase L: Action Tracker Central (spec section 28).
export type ActionSourceType =
  | "achievement" | "meeting" | "communication" | "quality" | "ncr" | "risk" | "issue"
  | "audit" | "stakeholder" | "management_decision" | "other";
export type ActionPriority = "low" | "medium" | "high" | "critical";
export type ActionStatus = "open" | "in_progress" | "completed" | "verified" | "closed";

export type PPMAction = {
  id: string;
  project_id: string;
  code?: string | null;
  source_type: ActionSourceType;
  source_id?: string | null;
  source_label?: string;
  description: string;
  responsible_name?: string;
  priority: ActionPriority;
  due_date?: string;
  status: ActionStatus;
  progress_percent?: number;
  evidence_note?: string;
  validated_by_name?: string;
  validated_at?: string;
  created_at: string;
  updated_at: string;
};

// EVM add-on (Wave 1): Earned Value Management. Opt-in per project — never imposed. EV/PV/AC
// are derived from the execution add-on's own validated data (Achievement, Expense) rather
// than a parallel model — see lib/ppm/evm.ts for the calculation engine that owns every formula.
export type EvMethod = "0_100" | "50_50" | "20_80" | "percent_complete" | "units_complete" | "milestone_weighted";
export type MilestoneWeight = { label: string; weight: number; completed: boolean; completed_date?: string };
export type EacMethod = "cpi" | "budgeted_rate" | "cpi_spi";
export type EvmControlLevel = "work_package" | "activity";
export type EvmReportingFrequency = "weekly" | "monthly" | "quarterly";

export type EvmSettings = {
  id: string;
  project_id: string;
  enabled: boolean;
  ev_method_default: EvMethod;
  control_level: EvmControlLevel;
  status_date: string;
  reporting_frequency?: EvmReportingFrequency;
  spi_threshold_green: number;
  spi_threshold_orange: number;
  cpi_threshold_green: number;
  cpi_threshold_orange: number;
  responsible_name?: string;
  created_at: string;
  updated_at: string;
};

export type TimePhasedBudget = {
  id: string;
  project_id: string;
  work_package_id: string;
  period_date: string;
  planned_amount: number;
  created_at: string;
  updated_at: string;
};

export type EvmSnapshotScope = "project" | "work_package";

export type EvmSnapshot = {
  id: string;
  project_id: string;
  scope: EvmSnapshotScope;
  scope_id?: string | null;
  status_date: string;
  bac?: number;
  pv?: number;
  ev?: number;
  ac?: number;
  sv?: number;
  cv?: number;
  spi?: number;
  cpi?: number;
  eac?: number;
  eac_method?: EacMethod;
  etc?: number;
  vac?: number;
  tcpi?: number;
  created_at: string;
};

// Computed shape (not a DB row) returned by lib/ppm/evm.ts.
export type EvmMetrics = {
  bac: number;
  bacSource?: "pmb" | "live_budget";
  pv: number;
  pvSource: "time_phased" | "linear_estimate" | "mixed";
  ev: number;
  ac: number;
  sv: number;
  cv: number;
  spi: number | null;
  cpi: number | null;
};

// EVM Wave 2: Performance Measurement Baseline versioning. Never overwritten — a new version
// is created and the previous "approved" one is flipped to "superseded".
export type PmbVersionStatus = "draft" | "approved" | "superseded";

export type PmbVersion = {
  id: string;
  project_id: string;
  version: number;
  status: PmbVersionStatus;
  bac?: number;
  note?: string;
  change_request_id?: string | null;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
};

export type PmbWorkPackageSnapshot = {
  id: string;
  pmb_version_id: string;
  work_package_id?: string | null;
  title?: string;
  bac?: number;
  planned_start?: string;
  planned_end?: string;
  created_at: string;
};

// Refinement program, Wave 1: Suppliers get a real directory (previously a free-text name on
// expenses/procurement), and implementation Sites get a proper Country->Region->Division->
// Subdivision->Site hierarchy (previously a free-text "Localisation" field everywhere).
export type SupplierCategory = "goods" | "services" | "works" | "consultancy" | "logistics" | "other";

export type Supplier = {
  id: string;
  project_id: string;
  name: string;
  category: SupplierCategory;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  tax_id?: string;
  notes?: string;
  status: PPMStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type Site = {
  id: string;
  project_id: string;
  country: string;
  region?: string;
  division?: string;
  subdivision?: string;
  site_name: string;
  site_code?: string | null;
  beneficiary_count?: number | null;
  site_type?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  notes?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};


export type OrganizationGrant = {
  id: string;
  organization_id: string;
  donor_id: string;
  reference: string;
  title?: string | null;
  status: OrgRegistryStatus;
};

// Refinement program, Wave 4: budget categories are a self-referencing tree exactly like WBS
// (lib/ppm/wbs.ts) — codes computed from tree shape via lib/ppm/budget-categories.ts, never stored.
export type BudgetCategory = {
  id: string;
  project_id: string;
  parent_id?: string | null;
  title: string;
  order_index: number;
  created_at: string;
};
