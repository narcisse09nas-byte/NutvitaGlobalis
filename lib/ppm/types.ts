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
  | "reporting" | "environmental" | "social" | "security" | "operational";

export type Requirement = {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  source?: string;
  source_stakeholder?: string;
  type: RequirementType;
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
  work_package_id?: string | null;
  parent_id?: string | null;
  kind: ActivityKind;
  title: string;
  description?: string;
  output_id?: string | null;
  responsible_name?: string;
  responsible_email?: string;
  ev_method: EvMethod;
  milestone_weights: MilestoneWeight[];
  co_responsible?: string[];
  location?: string;
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
  cost_category?: string;
  sub_category?: string;
  donor_name?: string;
  grant_reference?: string;
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
  status: PPMStatus;
  created_at: string;
  updated_at: string;
};

// Sprint 12: Resource management (spec section 22).
export type ResourceType = "human" | "consultant" | "equipment" | "vehicle" | "infrastructure";
export type ResourceCostUnit = "hour" | "day" | "week" | "month" | "flat";

export type PPMResource = {
  id: string;
  project_id: string;
  type: ResourceType;
  name: string;
  role_title?: string;
  skills?: string[];
  availability_percent?: number;
  weekly_capacity_hours?: number;
  cost_rate?: number;
  cost_unit?: ResourceCostUnit;
  currency?: string;
  status: PPMStatus;
  notes?: string;
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

export type ProcurementItem = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  activity_id?: string | null;
  budget_line_id?: string | null;
  title: string;
  description?: string;
  category: ProcurementCategory;
  procurement_method: ProcurementMethod;
  estimated_value?: number;
  currency?: string;
  stage: ProcurementStage;
  requested_by_name?: string;
  supplier_name?: string;
  contract_reference?: string;
  po_reference?: string;
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

export type QualityChecklistItem = { criterion: string; result: QualityResult; comment?: string };

export type QualityRequirement = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  activity_id?: string | null;
  title: string;
  standard_reference?: string;
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
  quality_requirement_id: string;
  title: string;
  category: QualityEvidenceCategory;
  file_path?: string;
  description?: string;
  uploaded_by_name?: string;
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
  residual_probability?: number;
  residual_impact?: number;
  status: RiskStatus;
  created_at: string;
  updated_at: string;
};

export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export type Issue = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  activity_id?: string | null;
  title: string;
  description?: string;
  category?: string;
  raised_by_name?: string;
  priority: ProjectPriority;
  owner_name?: string;
  resolution_plan?: string;
  due_date?: string;
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
  name: string;
  organization?: string;
  role_title?: string;
  category: StakeholderCategory;
  influence_level: StakeholderLevel;
  interest_level: StakeholderLevel;
  position: StakeholderPosition;
  contact_email?: string;
  contact_phone?: string;
  engagement_strategy?: string;
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
  stakeholder_id?: string | null;
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
  title: string;
  description?: string;
  type: DeliverableType;
  responsible_name?: string;
  planned_date?: string;
  actual_date?: string;
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
  entity_type: ApprovalEntityType;
  entity_id?: string | null;
  entity_label?: string;
  title: string;
  description?: string;
  requested_by_name?: string;
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

// Sprint 22: Audit Trail — reads public.ppm_history, populated since Sprint 2 by every
// status-changing action across the app (project creation, charter/baseline/change-request
// decisions, etc.). `actor_id` is a bare auth.users id: this app has no general people
// directory, so the UI can only tell "you" from "someone else" — see AuditTrailFeed.tsx.
export type AuditEntityType = "organization" | "portfolio" | "program" | "project";

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

export type Expense = {
  id: string;
  project_id: string;
  work_package_id?: string | null;
  activity_id?: string | null;
  budget_line_id?: string | null;
  procurement_item_id?: string | null;
  code?: string;
  donor_name?: string;
  grant_reference?: string;
  cost_center?: string;
  expense_date?: string;
  category?: ExpenseCategory;
  sub_category?: string;
  description: string;
  justification?: string;
  payee_name?: string;
  location?: string;
  amount_excl_tax: number;
  tax_amount?: number;
  amount_incl_tax: number;
  transaction_currency?: string;
  project_currency?: string;
  exchange_rate?: number;
  converted_amount?: number;
  payment_method?: PaymentMethod;
  payment_date?: string;
  transaction_reference?: string;
  invoice_number?: string;
  invoice_date?: string;
  po_reference?: string;
  contract_reference?: string;
  supplier_name?: string;
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
  procurement_item_id: string;
  supplier_name?: string;
  receipt_date?: string;
  site?: string;
  item_description?: string;
  quantity_ordered?: number;
  quantity_delivered?: number;
  quantity_accepted?: number;
  quantity_rejected?: number;
  rejection_reason?: string;
  quality_assessment?: ReceiptQualityAssessment;
  inspection_notes?: string;
  delivery_note_number?: string;
  receipt_minutes_reference?: string;
  received_by_name?: string;
  created_at: string;
};

export type ProcurementReceiptEvidenceCategory = "photo" | "delivery_note" | "receipt_minutes" | "other";

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
  description?: string;
  status: TimesheetStatus;
  approved_by_name?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type EquipmentCheckoutStatus = "checked_out" | "returned" | "lost" | "damaged";

export type EquipmentCheckout = {
  id: string;
  project_id: string;
  resource_id: string;
  activity_id?: string | null;
  user_name?: string;
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
export type CommunicationActualStatus = "draft" | "completed" | "validated";

export type CommunicationActual = {
  id: string;
  project_id: string;
  communication_item_id?: string | null;
  planned_date?: string;
  actual_date?: string;
  stakeholders?: string;
  participants?: string;
  channel?: string;
  subject: string;
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
  interaction_date?: string;
  interaction_type?: string;
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

// Execution add-on Phase L: Action Tracker Central (spec section 28).
export type ActionSourceType =
  | "achievement" | "meeting" | "communication" | "quality" | "ncr" | "risk" | "issue"
  | "audit" | "stakeholder" | "management_decision" | "other";
export type ActionPriority = "low" | "medium" | "high" | "critical";
export type ActionStatus = "open" | "in_progress" | "completed" | "verified" | "closed";

export type PPMAction = {
  id: string;
  project_id: string;
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
