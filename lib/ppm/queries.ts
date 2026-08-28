import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Achievement, AchievementEvidence, Activity, ActivityJournalEntry, ApprovalRequest, ArchiveItem, AssetInventoryLine, AssetInventorySession,
  AuditLogEntry, BudgetCategory, BudgetLine, CostCenter,
  ChangeRequest, CommunicationActual, CommunicationItem, Deliverable, EquipmentCheckout,
  Evaluation, EvmSettings, EvmSnapshot, Expense, ExternalApprover, FeedbackEntry, FeedbackFollowup, GovernanceRole, HandoverItem, Indicator,
  Issue, KnownPerson, LessonLearned, MealEntry, NonConformityReport, Operation,
  OpsActivityBeneficiary, OpsActivityReport, OpsActivityReportProduct,
  OpsAgeGroup, OpsCooperative, OpsCooperativeContact, OpsDeliveryLine, OpsDeliveryNote, OpsDeliveryReceiver,
  OpsDistributionPlan, OpsDistributionPlanDaily,
  OpsDistributionPlanProduct, OpsDistributionPlanSite, OpsDonorSynthesisExport, OpsIngredientPrice, OpsInvoice,
  OpsInvoicePaymentTracking, OpsMenu, OpsMenuIngredient,
  OpsNeed, OpsNeedProduct, OpsNeedSite, OpsPoDailyLine, OpsPoIngredientLine, OpsProduct, OpsPurchaseOrder,
  OpsRation, OpsReconciliationCooperativeRow, OpsReconciliationDatesRow, OpsReconciliationNote,
  OpsReconciliationProductRow, OpsReconciliationValueRow,
  OpsSchoolCooperativeContract, OpsSite, OpsSitePaymentAccount, OpsSiteStockLedgerEntry, OpsSiteTeamMember, Organization,
  OrganizationDonor, OrganizationGrant, OrganizationStaff, OrganizationSupplier, OrganizationUnit, Portfolio, ProjectSite,
  PmbVersion, PmbWorkPackageSnapshot, PPMAction, PPMDocument, PPMNotification, PPMResource,
  PpmTask, PpmTaskList,
  Program, ProcurementItem, ProcurementReceipt, ProcurementReceiptCriterion, ProcurementReceiptEvidence, ProcurementReceiptLine, Project, ProjectCharter, ProjectClosure, ProjectContract, ProjectFinanceSettings, QualityRequirement, ReceiptCommitteeMember,
  QualityControlActual, RaciEntry, Report, Requirement, ResourceAssignment, ResultChainNode, Risk,
  RiskReview, ScopeBaseline, ScopeStatement, Site, Stakeholder, StakeholderInteraction, Supplier,
  TimePhasedBudget, Timesheet, WBSNode,
} from "./types";

// Operations Management (distribution cycles) — mirrors the Project list/get/history convention.
export async function listOperations(supabase: SupabaseClient, filters: { organizationId?: string; projectId?: string } = {}): Promise<Operation[]> {
  let query = supabase.from("ppm_ops_operations").select("*").order("created_at", { ascending: false });
  if (filters.organizationId) query = query.eq("organization_id", filters.organizationId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  const { data } = await query;
  return (data || []) as Operation[];
}

export async function getOperation(supabase: SupabaseClient, id: string): Promise<Operation | null> {
  const { data } = await supabase.from("ppm_ops_operations").select("*").eq("id", id).maybeSingle();
  return (data as Operation) || null;
}

export async function listOperationHistory(supabase: SupabaseClient, operationId: string): Promise<AuditLogEntry[]> {
  const { data } = await supabase.from("ppm_history").select("*").eq("entity_type", "distribution_operation").eq("entity_id", operationId).order("created_at", { ascending: false }).limit(100);
  return (data || []) as AuditLogEntry[];
}

export async function listOpsSites(supabase: SupabaseClient, operationId: string): Promise<OpsSite[]> {
  const { data } = await supabase.from("ppm_ops_sites").select("*").eq("operation_id", operationId).order("name");
  return (data || []) as OpsSite[];
}

export async function listOpsProducts(supabase: SupabaseClient, organizationId: string): Promise<OpsProduct[]> {
  const { data } = await supabase.from("ppm_ops_products").select("*").eq("organization_id", organizationId).order("name");
  return (data || []) as OpsProduct[];
}

export async function getOpsSite(supabase: SupabaseClient, id: string): Promise<OpsSite | null> {
  const { data } = await supabase.from("ppm_ops_sites").select("*").eq("id", id).maybeSingle();
  return (data as OpsSite) || null;
}

export async function listOpsSitePaymentAccounts(supabase: SupabaseClient, siteId: string): Promise<OpsSitePaymentAccount[]> {
  const { data } = await supabase.from("ppm_ops_site_payment_accounts").select("*").eq("site_id", siteId).order("is_default", { ascending: false });
  return (data || []) as OpsSitePaymentAccount[];
}

export async function listOpsSiteTeamMembers(supabase: SupabaseClient, siteId: string): Promise<OpsSiteTeamMember[]> {
  const { data } = await supabase.from("ppm_ops_site_team_members").select("*").eq("site_id", siteId).order("full_name");
  return (data || []) as OpsSiteTeamMember[];
}

export async function listOpsRations(supabase: SupabaseClient, operationId: string): Promise<OpsRation[]> {
  const { data } = await supabase.from("ppm_ops_rations").select("*").eq("operation_id", operationId).order("created_at");
  return (data || []) as OpsRation[];
}

export async function listOpsMenus(supabase: SupabaseClient, operationId: string): Promise<OpsMenu[]> {
  const { data } = await supabase.from("ppm_ops_menus").select("*").eq("operation_id", operationId).order("name");
  return (data || []) as OpsMenu[];
}

export async function listOpsMenuIngredients(supabase: SupabaseClient, menuId: string): Promise<OpsMenuIngredient[]> {
  const { data } = await supabase.from("ppm_ops_menu_ingredients").select("*").eq("menu_id", menuId).order("created_at");
  return (data || []) as OpsMenuIngredient[];
}

// Every ingredient line across every menu of an operation — used to compute a purchase order's
// generated ingredient table without one query per menu.
export async function listOpsAllMenuIngredients(supabase: SupabaseClient, operationId: string): Promise<OpsMenuIngredient[]> {
  const { data } = await supabase.from("ppm_ops_menu_ingredients").select("*, ppm_ops_menus!inner(operation_id)").eq("ppm_ops_menus.operation_id", operationId);
  return (data || []) as OpsMenuIngredient[];
}

// Only the currently-approved price per product — the append-only history is fetched separately
// (listOpsIngredientPriceHistory) only where a manager actually needs to display it.
export async function listOpsIngredientPrices(supabase: SupabaseClient, operationId: string): Promise<OpsIngredientPrice[]> {
  const { data } = await supabase.from("ppm_ops_ingredient_prices").select("*").eq("operation_id", operationId).eq("status", "approved").order("effective_from", { ascending: false });
  return (data || []) as OpsIngredientPrice[];
}

export async function listOpsIngredientPriceHistory(supabase: SupabaseClient, operationId: string, productId: string): Promise<OpsIngredientPrice[]> {
  const { data } = await supabase.from("ppm_ops_ingredient_prices").select("*").eq("operation_id", operationId).eq("product_id", productId).order("created_at", { ascending: false });
  return (data || []) as OpsIngredientPrice[];
}

export async function listOpsCooperatives(supabase: SupabaseClient, organizationId: string): Promise<OpsCooperative[]> {
  const { data } = await supabase.from("ppm_ops_cooperatives").select("*").eq("organization_id", organizationId).order("name");
  return (data || []) as OpsCooperative[];
}

export async function listOpsCooperativeContacts(supabase: SupabaseClient, cooperativeId: string): Promise<OpsCooperativeContact[]> {
  const { data } = await supabase.from("ppm_ops_cooperative_contacts").select("*").eq("cooperative_id", cooperativeId).order("full_name");
  return (data || []) as OpsCooperativeContact[];
}

export async function listOpsSchoolCooperativeContracts(supabase: SupabaseClient, operationId: string): Promise<OpsSchoolCooperativeContract[]> {
  const { data } = await supabase.from("ppm_ops_school_cooperative_contracts").select("*, ppm_ops_sites!inner(operation_id)").eq("ppm_ops_sites.operation_id", operationId).order("created_at", { ascending: false });
  return (data || []) as OpsSchoolCooperativeContract[];
}

export async function listOpsAgeGroups(supabase: SupabaseClient, operationId: string): Promise<OpsAgeGroup[]> {
  const { data } = await supabase.from("ppm_ops_age_groups").select("*").eq("operation_id", operationId).order("sort_order");
  return (data || []) as OpsAgeGroup[];
}

export async function listOpsDistributionPlans(supabase: SupabaseClient, operationId: string): Promise<OpsDistributionPlan[]> {
  const { data } = await supabase.from("ppm_ops_distribution_plans").select("*").eq("operation_id", operationId).order("created_at", { ascending: false });
  return (data || []) as OpsDistributionPlan[];
}

export async function listOpsPlanHistory(supabase: SupabaseClient, planId: string): Promise<AuditLogEntry[]> {
  const { data } = await supabase.from("ppm_history").select("*").eq("entity_type", "distribution_plan").eq("entity_id", planId).order("created_at", { ascending: false }).limit(100);
  return (data || []) as AuditLogEntry[];
}

export async function listOpsPlanSites(supabase: SupabaseClient, planId: string): Promise<OpsDistributionPlanSite[]> {
  const { data } = await supabase.from("ppm_ops_distribution_plan_sites").select("*").eq("plan_id", planId);
  return (data || []) as OpsDistributionPlanSite[];
}

export async function listOpsPlanProducts(supabase: SupabaseClient, planSiteId: string): Promise<OpsDistributionPlanProduct[]> {
  const { data } = await supabase.from("ppm_ops_distribution_plan_products").select("*").eq("plan_site_id", planSiteId);
  return (data || []) as OpsDistributionPlanProduct[];
}

export async function listOpsPlanDaily(supabase: SupabaseClient, planSiteId: string): Promise<OpsDistributionPlanDaily[]> {
  const { data } = await supabase.from("ppm_ops_distribution_plan_daily").select("*").eq("plan_site_id", planSiteId).order("ration_date");
  return (data || []) as OpsDistributionPlanDaily[];
}

// Current balance per product at one site — the latest ledger row already carries the running
// total, so no aggregation is needed (see the balance_after column on ppm_ops_site_stock_ledger).
export async function getOpsSiteStock(supabase: SupabaseClient, siteId: string): Promise<Record<string, number>> {
  const { data } = await supabase.from("ppm_ops_site_stock_ledger").select("product_id,balance_after,recorded_at").eq("site_id", siteId).order("recorded_at", { ascending: false });
  const balances: Record<string, number> = {};
  for (const row of (data || []) as OpsSiteStockLedgerEntry[]) if (!(row.product_id in balances)) balances[row.product_id] = row.balance_after;
  return balances;
}

export async function listOpsNeeds(supabase: SupabaseClient, operationId: string): Promise<OpsNeed[]> {
  const { data } = await supabase.from("ppm_ops_needs").select("*").eq("operation_id", operationId).order("created_at", { ascending: false });
  return (data || []) as OpsNeed[];
}

export async function listOpsNeedSites(supabase: SupabaseClient, needId: string): Promise<OpsNeedSite[]> {
  const { data } = await supabase.from("ppm_ops_need_sites").select("*").eq("need_id", needId);
  return (data || []) as OpsNeedSite[];
}

export async function listOpsNeedProducts(supabase: SupabaseClient, needSiteId: string): Promise<OpsNeedProduct[]> {
  const { data } = await supabase.from("ppm_ops_need_products").select("*").eq("need_site_id", needSiteId);
  return (data || []) as OpsNeedProduct[];
}

// Purchase orders reference their plan directly, not the operation — join through
// ppm_ops_distribution_plans to list every PO for one operation.
export async function listOpsPurchaseOrders(supabase: SupabaseClient, operationId: string): Promise<OpsPurchaseOrder[]> {
  const { data } = await supabase.from("ppm_ops_purchase_orders").select("*, ppm_ops_distribution_plans!inner(operation_id)").eq("ppm_ops_distribution_plans.operation_id", operationId).order("created_at", { ascending: false });
  return (data || []) as OpsPurchaseOrder[];
}

export async function listOpsPoDailyLines(supabase: SupabaseClient, poId: string): Promise<OpsPoDailyLine[]> {
  const { data } = await supabase.from("ppm_ops_po_daily_lines").select("*").eq("po_id", poId).order("ration_date");
  return (data || []) as OpsPoDailyLine[];
}

export async function listOpsPoIngredientLines(supabase: SupabaseClient, poId: string): Promise<OpsPoIngredientLine[]> {
  const { data } = await supabase.from("ppm_ops_po_ingredient_lines").select("*").eq("po_id", poId);
  return (data || []) as OpsPoIngredientLine[];
}

export async function listOpsDeliveryNotes(supabase: SupabaseClient, operationId: string): Promise<OpsDeliveryNote[]> {
  const { data } = await supabase.from("ppm_ops_delivery_notes").select("*, ppm_ops_sites!inner(operation_id)").eq("ppm_ops_sites.operation_id", operationId).order("created_at", { ascending: false });
  return (data || []) as OpsDeliveryNote[];
}

export async function listOpsDeliveryLines(supabase: SupabaseClient, deliveryNoteId: string): Promise<OpsDeliveryLine[]> {
  const { data } = await supabase.from("ppm_ops_delivery_lines").select("*").eq("delivery_note_id", deliveryNoteId);
  return (data || []) as OpsDeliveryLine[];
}

export async function listOpsDeliveryReceivers(supabase: SupabaseClient, deliveryNoteId: string): Promise<OpsDeliveryReceiver[]> {
  const { data } = await supabase.from("ppm_ops_delivery_receivers").select("*").eq("delivery_note_id", deliveryNoteId);
  return (data || []) as OpsDeliveryReceiver[];
}

export async function listOpsActivityReports(supabase: SupabaseClient, operationId: string): Promise<OpsActivityReport[]> {
  const { data } = await supabase.from("ppm_ops_activity_reports").select("*, ppm_ops_sites!inner(operation_id)").eq("ppm_ops_sites.operation_id", operationId).order("created_at", { ascending: false });
  return (data || []) as OpsActivityReport[];
}

export async function listOpsActivityReportProducts(supabase: SupabaseClient, reportId: string): Promise<OpsActivityReportProduct[]> {
  const { data } = await supabase.from("ppm_ops_activity_report_products").select("*").eq("report_id", reportId);
  return (data || []) as OpsActivityReportProduct[];
}

export async function listOpsActivityBeneficiaries(supabase: SupabaseClient, reportId: string): Promise<OpsActivityBeneficiary[]> {
  const { data } = await supabase.from("ppm_ops_activity_beneficiaries").select("*").eq("report_id", reportId);
  return (data || []) as OpsActivityBeneficiary[];
}

export async function listOpsInvoices(supabase: SupabaseClient, operationId: string): Promise<OpsInvoice[]> {
  const { data } = await supabase.from("ppm_ops_invoices").select("*, ppm_ops_sites!inner(operation_id)").eq("ppm_ops_sites.operation_id", operationId).order("created_at", { ascending: false });
  return (data || []) as OpsInvoice[];
}

// External distribution-partner portal (Wave 7) — scoped by the caller's own linked site_ids;
// RLS (ppm_ops_partner_site_access) already restricts visibility at the row level, so these are
// plain site-scoped list queries, not operation-scoped ones.
export async function getOpsSitesByIds(supabase: SupabaseClient, siteIds: string[]): Promise<OpsSite[]> {
  if (!siteIds.length) return [];
  const { data } = await supabase.from("ppm_ops_sites").select("*").in("id", siteIds);
  return (data || []) as OpsSite[];
}

export async function listOpsPurchaseOrdersForSites(supabase: SupabaseClient, siteIds: string[]): Promise<OpsPurchaseOrder[]> {
  if (!siteIds.length) return [];
  const { data } = await supabase.from("ppm_ops_purchase_orders").select("*").in("site_id", siteIds).order("created_at", { ascending: false });
  return (data || []) as OpsPurchaseOrder[];
}

export async function listOpsDeliveryNotesForSites(supabase: SupabaseClient, siteIds: string[]): Promise<OpsDeliveryNote[]> {
  if (!siteIds.length) return [];
  const { data } = await supabase.from("ppm_ops_delivery_notes").select("*").in("site_id", siteIds).order("created_at", { ascending: false });
  return (data || []) as OpsDeliveryNote[];
}

export async function listOpsInvoicesForSites(supabase: SupabaseClient, siteIds: string[]): Promise<OpsInvoice[]> {
  if (!siteIds.length) return [];
  const { data } = await supabase.from("ppm_ops_invoices").select("*").in("site_id", siteIds).order("created_at", { ascending: false });
  return (data || []) as OpsInvoice[];
}

// Reconciliation et fermeture (Wave 8) — payment tracking, computed reconciliation views, notes.
// Takes the invoice ids the caller already fetched for the operation (via listOpsInvoices), to
// avoid a fragile two-level-nested embedded filter over invoices -> sites -> operation_id.
export async function listOpsInvoicePaymentTracking(supabase: SupabaseClient, invoiceIds: string[]): Promise<OpsInvoicePaymentTracking[]> {
  if (!invoiceIds.length) return [];
  const { data } = await supabase.from("ppm_ops_invoice_payment_tracking").select("*").in("invoice_id", invoiceIds);
  return (data || []) as OpsInvoicePaymentTracking[];
}

export async function listOpsReconciliationProducts(supabase: SupabaseClient, operationId: string): Promise<OpsReconciliationProductRow[]> {
  const { data } = await supabase.from("ppm_ops_reconciliation_products_v").select("*").eq("operation_id", operationId).order("period_start", { ascending: false });
  return (data || []) as OpsReconciliationProductRow[];
}

export async function listOpsReconciliationValue(supabase: SupabaseClient, operationId: string): Promise<OpsReconciliationValueRow[]> {
  const { data } = await supabase.from("ppm_ops_reconciliation_value_v").select("*").eq("operation_id", operationId).order("period_start", { ascending: false });
  return (data || []) as OpsReconciliationValueRow[];
}

export async function listOpsReconciliationCooperative(supabase: SupabaseClient, operationId: string): Promise<OpsReconciliationCooperativeRow[]> {
  const { data } = await supabase.from("ppm_ops_reconciliation_cooperative_v").select("*").eq("operation_id", operationId);
  return (data || []) as OpsReconciliationCooperativeRow[];
}

export async function listOpsReconciliationDates(supabase: SupabaseClient, operationId: string): Promise<OpsReconciliationDatesRow[]> {
  const { data } = await supabase.from("ppm_ops_reconciliation_dates_v").select("*").eq("operation_id", operationId).order("period_start", { ascending: false });
  return (data || []) as OpsReconciliationDatesRow[];
}

export async function listOpsReconciliationNotes(supabase: SupabaseClient, operationId: string): Promise<OpsReconciliationNote[]> {
  const { data } = await supabase.from("ppm_ops_reconciliation_notes").select("*").eq("operation_id", operationId).order("created_at", { ascending: false });
  return (data || []) as OpsReconciliationNote[];
}

export async function listOpsDonorSynthesisExports(supabase: SupabaseClient, operationId: string): Promise<OpsDonorSynthesisExport[]> {
  const { data } = await supabase.from("ppm_ops_donor_synthesis_exports").select("*").eq("operation_id", operationId).order("generated_at", { ascending: false });
  return (data || []) as OpsDonorSynthesisExport[];
}

// Time Table / action tracker (Wave 9 polish).
export async function listTaskLists(supabase: SupabaseClient, filters: { organizationId?: string; projectId?: string; operationId?: string } = {}): Promise<PpmTaskList[]> {
  let query = supabase.from("ppm_task_lists").select("*").order("period_start", { ascending: false });
  if (filters.organizationId) query = query.eq("organization_id", filters.organizationId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.operationId) query = query.eq("operation_id", filters.operationId);
  const { data } = await query;
  return (data || []) as PpmTaskList[];
}

export async function getTaskList(supabase: SupabaseClient, id: string): Promise<PpmTaskList | null> {
  const { data } = await supabase.from("ppm_task_lists").select("*").eq("id", id).maybeSingle();
  return (data as PpmTaskList) || null;
}

export async function listTasks(supabase: SupabaseClient, taskListId: string): Promise<PpmTask[]> {
  const { data } = await supabase.from("ppm_tasks").select("*").eq("task_list_id", taskListId).order("sort_order");
  return (data || []) as PpmTask[];
}

export async function listOrganizations(supabase: SupabaseClient): Promise<Organization[]> {
  const { data } = await supabase.from("ppm_organizations").select("*").order("name");
  return (data || []) as Organization[];
}

export async function getOrganization(supabase: SupabaseClient, id: string): Promise<Organization | null> {
  const { data } = await supabase.from("ppm_organizations").select("*").eq("id", id).maybeSingle();
  return (data as Organization) || null;
}

export async function listOrganizationStaff(supabase: SupabaseClient, organizationId: string): Promise<OrganizationStaff[]> {
  const { data } = await supabase.from("ppm_organization_staff").select("*").eq("organization_id", organizationId).order("full_name");
  return (data || []) as OrganizationStaff[];
}

export async function listAllOrganizationStaff(supabase: SupabaseClient): Promise<OrganizationStaff[]> {
  const { data } = await supabase.from("ppm_organization_staff").select("*").eq("status", "active").order("full_name");
  return (data || []) as OrganizationStaff[];
}

export async function listOrganizationDonors(supabase: SupabaseClient, organizationId: string): Promise<OrganizationDonor[]> {
  const { data } = await supabase.from("ppm_organization_donors").select("*").eq("organization_id", organizationId).order("name");
  return (data || []) as OrganizationDonor[];
}

export async function listOrganizationGrants(supabase: SupabaseClient, organizationId: string): Promise<OrganizationGrant[]> {
  const { data } = await supabase.from("ppm_organization_grants").select("*").eq("organization_id", organizationId).order("reference");
  return (data || []) as OrganizationGrant[];
}
export async function listOrganizationSuppliers(supabase: SupabaseClient, organizationId: string): Promise<OrganizationSupplier[]> {
  const { data } = await supabase.from("ppm_organization_suppliers").select("*").eq("organization_id", organizationId).order("name");
  return (data || []) as OrganizationSupplier[];
}

export async function listOrganizationUnits(supabase: SupabaseClient, organizationId: string): Promise<OrganizationUnit[]> {
  const { data } = await supabase.from("ppm_organization_units").select("*").eq("organization_id", organizationId).order("name");
  return (data || []) as OrganizationUnit[];
}

export async function listProjectSites(supabase: SupabaseClient, projectId: string): Promise<ProjectSite[]> {
  const { data } = await supabase.from("ppm_project_sites").select("*").eq("project_id", projectId).order("sort_order");
  return (data || []) as ProjectSite[];
}

export async function listActivityJournalEntries(supabase: SupabaseClient, projectId: string): Promise<ActivityJournalEntry[]> {
  const { data } = await supabase.from("ppm_project_activity_journal").select("*").eq("project_id", projectId).order("entry_date", { ascending: false });
  return (data || []) as ActivityJournalEntry[];
}

export async function listPortfolios(supabase: SupabaseClient, organizationId?: string): Promise<Portfolio[]> {
  let query = supabase.from("ppm_portfolios").select("*").order("name");
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query;
  return (data || []) as Portfolio[];
}

export async function getPortfolio(supabase: SupabaseClient, id: string): Promise<Portfolio | null> {
  const { data } = await supabase.from("ppm_portfolios").select("*").eq("id", id).maybeSingle();
  return (data as Portfolio) || null;
}

export async function listPrograms(supabase: SupabaseClient, portfolioId?: string): Promise<Program[]> {
  let query = supabase.from("ppm_programs").select("*").order("name");
  if (portfolioId) query = query.eq("portfolio_id", portfolioId);
  const { data } = await query;
  return (data || []) as Program[];
}

export async function getProgram(supabase: SupabaseClient, id: string): Promise<Program | null> {
  const { data } = await supabase.from("ppm_programs").select("*").eq("id", id).maybeSingle();
  return (data as Program) || null;
}

export async function ppmCounts(supabase: SupabaseClient) {
  const [{ count: organizations }, { count: portfolios }, { count: programs }, { count: projects }] = await Promise.all([
    supabase.from("ppm_organizations").select("id", { count: "exact", head: true }),
    supabase.from("ppm_portfolios").select("id", { count: "exact", head: true }),
    supabase.from("ppm_programs").select("id", { count: "exact", head: true }),
    supabase.from("ppm_projects").select("id", { count: "exact", head: true }),
  ]);
  return { organizations: organizations || 0, portfolios: portfolios || 0, programs: programs || 0, projects: projects || 0 };
}

export async function listProjects(supabase: SupabaseClient, filters: { portfolioId?: string; programId?: string } = {}): Promise<Project[]> {
  let query = supabase.from("ppm_projects").select("*").order("name");
  if (filters.portfolioId) query = query.eq("portfolio_id", filters.portfolioId);
  if (filters.programId) query = query.eq("program_id", filters.programId);
  const { data } = await query;
  return (data || []) as Project[];
}

export async function getProject(supabase: SupabaseClient, id: string): Promise<Project | null> {
  const { data } = await supabase.from("ppm_projects").select("*").eq("id", id).maybeSingle();
  return (data as Project) || null;
}

export async function listCharters(supabase: SupabaseClient, projectId: string): Promise<ProjectCharter[]> {
  const { data } = await supabase.from("ppm_project_charters").select("*").eq("project_id", projectId).order("version", { ascending: false });
  return (data || []) as ProjectCharter[];
}

export async function listRequirements(supabase: SupabaseClient, projectId: string): Promise<Requirement[]> {
  const { data } = await supabase.from("ppm_requirements").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as Requirement[];
}

export async function getScopeStatement(supabase: SupabaseClient, projectId: string): Promise<ScopeStatement | null> {
  const { data } = await supabase.from("ppm_scope_statements").select("*").eq("project_id", projectId).maybeSingle();
  return (data as ScopeStatement) || null;
}

// Sprint 6: Results framework + governance
export async function listResultChain(supabase: SupabaseClient, projectId: string): Promise<ResultChainNode[]> {
  const { data } = await supabase.from("ppm_result_chains").select("*").eq("project_id", projectId).order("order_index");
  return (data || []) as ResultChainNode[];
}

export async function listIndicators(supabase: SupabaseClient, projectId: string): Promise<Indicator[]> {
  const { data } = await supabase.from("ppm_indicators").select("*").eq("project_id", projectId).order("name");
  return (data || []) as Indicator[];
}

export async function listGovernanceRoles(supabase: SupabaseClient, projectId: string): Promise<GovernanceRole[]> {
  const { data } = await supabase.from("ppm_governance_roles").select("*").eq("project_id", projectId).order("created_at");
  return (data || []) as GovernanceRole[];
}

export async function listRaciEntries(supabase: SupabaseClient, projectId: string): Promise<RaciEntry[]> {
  const { data } = await supabase.from("ppm_raci_entries").select("*").eq("project_id", projectId);
  return (data || []) as RaciEntry[];
}

// Sprint 7: WBS
export async function listWbsNodes(supabase: SupabaseClient, projectId: string): Promise<WBSNode[]> {
  const { data } = await supabase.from("ppm_wbs_nodes").select("*").eq("project_id", projectId).order("order_index");
  return (data || []) as WBSNode[];
}

// Sprint 8: Scope Baseline + Change Control
export async function listScopeBaselines(supabase: SupabaseClient, projectId: string): Promise<ScopeBaseline[]> {
  const { data } = await supabase.from("ppm_scope_baselines").select("*").eq("project_id", projectId).order("version", { ascending: false });
  return (data || []) as ScopeBaseline[];
}

export async function listChangeRequests(supabase: SupabaseClient, projectId: string): Promise<ChangeRequest[]> {
  const { data } = await supabase.from("ppm_change_requests").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as ChangeRequest[];
}

// Sprint 9-10: PDM / activities (also powers Gantt, calendar and Kanban views)
export async function listActivities(supabase: SupabaseClient, projectId: string): Promise<Activity[]> {
  const { data } = await supabase.from("ppm_activities").select("*").eq("project_id", projectId).order("order_index");
  return (data || []) as Activity[];
}

// Sprint 11: Budget
export async function listBudgetLines(supabase: SupabaseClient, projectId: string): Promise<BudgetLine[]> {
  const { data } = await supabase.from("ppm_budget_lines").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as BudgetLine[];
}

// Refinement program, Wave 4: Budget category hierarchy
export async function listBudgetCategories(supabase: SupabaseClient, projectId: string): Promise<BudgetCategory[]> {
  const { data } = await supabase.from("ppm_budget_categories").select("*").eq("project_id", projectId).order("order_index");
  return (data || []) as BudgetCategory[];
}

export async function getProjectFinanceSettings(supabase: SupabaseClient, projectId: string): Promise<ProjectFinanceSettings | null> {
  const { data } = await supabase.from("ppm_project_finance_settings").select("*").eq("project_id", projectId).maybeSingle();
  return (data as ProjectFinanceSettings) || null;
}

export async function listCostCenters(supabase: SupabaseClient, projectId: string): Promise<CostCenter[]> {
  const { data } = await supabase.from("ppm_cost_centers").select("*").eq("project_id", projectId).order("code");
  return (data || []) as CostCenter[];
}

export async function listProjectContracts(supabase: SupabaseClient, projectId: string): Promise<ProjectContract[]> {
  const { data } = await supabase.from("ppm_project_contracts").select("*").eq("project_id", projectId).order("contract_number");
  return (data || []) as ProjectContract[];
}

// Sprint 12: Resources
export async function listResources(supabase: SupabaseClient, projectId: string): Promise<PPMResource[]> {
  const { data } = await supabase.from("ppm_resources").select("*").eq("project_id", projectId).order("name");
  return (data || []) as PPMResource[];
}

export async function listResourceAssignments(supabase: SupabaseClient, projectId: string): Promise<ResourceAssignment[]> {
  const { data } = await supabase.from("ppm_resource_assignments").select("*").eq("project_id", projectId);
  return (data || []) as ResourceAssignment[];
}

// Refinement program (person-field audit): org-wide staff pool for Portfolio/Program/new-Project
// forms, which sit above any single project and so have no project_id to scope ppm_resources by.
// RLS still restricts this to resources the current user can see.
export async function listAllStaff(supabase: SupabaseClient): Promise<PPMResource[]> {
  const { data } = await supabase.from("ppm_resources").select("*").in("type", ["human", "consultant"]).order("name");
  return (data || []) as PPMResource[];
}

// Refinement program, Wave 1: Suppliers + Sites
export async function listSuppliers(supabase: SupabaseClient, projectId: string): Promise<Supplier[]> {
  const { data } = await supabase.from("ppm_suppliers").select("*").eq("project_id", projectId).order("name");
  return (data || []) as Supplier[];
}

export async function listSites(supabase: SupabaseClient, projectId: string): Promise<Site[]> {
  const { data } = await supabase.from("ppm_sites").select("*").eq("project_id", projectId).order("site_name");
  return (data || []) as Site[];
}

// Sprint 13: Procurement
export async function listProcurementItems(supabase: SupabaseClient, projectId: string): Promise<ProcurementItem[]> {
  const { data } = await supabase.from("ppm_procurement_items").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as ProcurementItem[];
}

export async function listProcurementReceipts(supabase: SupabaseClient, projectId: string): Promise<ProcurementReceipt[]> {
  const { data } = await supabase.from("ppm_procurement_receipts").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as ProcurementReceipt[];
}
export async function listProcurementReceiptLines(supabase: SupabaseClient, receiptIds: string[]): Promise<ProcurementReceiptLine[]> {
  if (!receiptIds.length) return [];
  const { data } = await supabase.from("ppm_procurement_receipt_lines").select("*").in("receipt_id", receiptIds).order("created_at");
  return (data || []) as ProcurementReceiptLine[];
}
export async function listProcurementReceiptCriteria(supabase: SupabaseClient, receiptIds: string[]): Promise<ProcurementReceiptCriterion[]> {
  if (!receiptIds.length) return [];
  const { data } = await supabase.from("ppm_procurement_receipt_criteria").select("*").in("receipt_id", receiptIds).order("created_at");
  return (data || []) as ProcurementReceiptCriterion[];
}
export async function listReceiptCommitteeMembers(supabase: SupabaseClient, receiptIds: string[]): Promise<ReceiptCommitteeMember[]> {
  if (!receiptIds.length) return [];
  const { data } = await supabase.from("ppm_receipt_committee_members").select("*").in("receipt_id", receiptIds).order("created_at");
  return (data || []) as ReceiptCommitteeMember[];
}
export async function listProcurementReceiptEvidence(supabase: SupabaseClient, receiptIds: string[]): Promise<ProcurementReceiptEvidence[]> {
  if (!receiptIds.length) return [];
  const { data } = await supabase.from("ppm_procurement_receipt_evidence").select("*").in("receipt_id", receiptIds).order("created_at");
  return (data || []) as ProcurementReceiptEvidence[];
}

// Sprint 14: Quality
export async function listQualityRequirements(supabase: SupabaseClient, projectId: string): Promise<QualityRequirement[]> {
  const { data } = await supabase.from("ppm_quality_requirements").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as QualityRequirement[];
}

export async function listNcrs(supabase: SupabaseClient, projectId: string): Promise<NonConformityReport[]> {
  const { data } = await supabase.from("ppm_ncr").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as NonConformityReport[];
}

// Refinement program, Wave 6: Quality control actuals + Risk reviews
export async function listQualityControlActuals(supabase: SupabaseClient, projectId: string): Promise<QualityControlActual[]> {
  const { data } = await supabase.from("ppm_quality_control_actuals").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as QualityControlActual[];
}

export async function listRiskReviews(supabase: SupabaseClient, projectId: string): Promise<RiskReview[]> {
  const { data } = await supabase.from("ppm_risk_reviews").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as RiskReview[];
}

// Sprint 15: Risks + Issues
export async function listRisks(supabase: SupabaseClient, projectId: string): Promise<Risk[]> {
  const { data } = await supabase.from("ppm_risks").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as Risk[];
}

export async function listIssues(supabase: SupabaseClient, projectId: string): Promise<Issue[]> {
  const { data } = await supabase.from("ppm_issues").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as Issue[];
}

// Sprint 16: Stakeholders + Communication
export async function listStakeholders(supabase: SupabaseClient, projectId: string): Promise<Stakeholder[]> {
  const { data } = await supabase.from("ppm_stakeholders").select("*").eq("project_id", projectId).order("name");
  return (data || []) as Stakeholder[];
}

export async function listCommunicationItems(supabase: SupabaseClient, projectId: string): Promise<CommunicationItem[]> {
  const { data } = await supabase.from("ppm_communication_items").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as CommunicationItem[];
}

// Sprint 17: MEAL
export async function listMealEntries(supabase: SupabaseClient, projectId: string): Promise<MealEntry[]> {
  const { data } = await supabase.from("ppm_meal_entries").select("*").eq("project_id", projectId).order("collection_date", { ascending: false });
  return (data || []) as MealEntry[];
}

export async function listEvaluations(supabase: SupabaseClient, projectId: string): Promise<Evaluation[]> {
  const { data } = await supabase.from("ppm_evaluations").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as Evaluation[];
}

export async function listFeedbackEntries(supabase: SupabaseClient, projectId: string): Promise<FeedbackEntry[]> {
  const { data } = await supabase.from("ppm_feedback_entries").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as FeedbackEntry[];
}

export async function listLessonsLearned(supabase: SupabaseClient, projectId: string): Promise<LessonLearned[]> {
  const { data } = await supabase.from("ppm_lessons_learned").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as LessonLearned[];
}

export async function listFeedbackFollowups(supabase: SupabaseClient, projectId: string): Promise<FeedbackFollowup[]> {
  const { data } = await supabase.from("ppm_feedback_followups").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as FeedbackFollowup[];
}

// Sprint 18: Deliverables + Documents
export async function listDeliverables(supabase: SupabaseClient, projectId: string): Promise<Deliverable[]> {
  const { data } = await supabase.from("ppm_deliverables").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as Deliverable[];
}

export async function listDocuments(supabase: SupabaseClient, projectId: string): Promise<PPMDocument[]> {
  const { data } = await supabase.from("ppm_documents").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as PPMDocument[];
}

// Sprint 19: Reporting
export async function listReports(supabase: SupabaseClient, projectId: string): Promise<Report[]> {
  const { data } = await supabase.from("ppm_reports").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as Report[];
}

// Sprint 21: Notifications + Approval workflows
export async function listNotifications(supabase: SupabaseClient): Promise<PPMNotification[]> {
  const { data } = await supabase.from("ppm_notifications").select("*").order("created_at", { ascending: false }).limit(50);
  return (data || []) as PPMNotification[];
}

export async function listApprovalRequests(supabase: SupabaseClient, projectId: string): Promise<ApprovalRequest[]> {
  const { data } = await supabase.from("ppm_approval_requests").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as ApprovalRequest[];
}

// Refinement program, Wave 8
export async function listExternalApprovers(supabase: SupabaseClient, projectId: string): Promise<ExternalApprover[]> {
  const { data } = await supabase.from("ppm_external_approvers").select("*").eq("project_id", projectId).order("name");
  return (data || []) as ExternalApprover[];
}

export async function listHandoverItems(supabase: SupabaseClient, projectId: string): Promise<HandoverItem[]> {
  const { data } = await supabase.from("ppm_handover_items").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as HandoverItem[];
}

export async function listArchiveItems(supabase: SupabaseClient, projectId: string): Promise<ArchiveItem[]> {
  const { data } = await supabase.from("ppm_archive_items").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as ArchiveItem[];
}

// Sprint 22: Audit Trail (reads public.ppm_history, populated since Sprint 2)
export async function listProjectHistory(supabase: SupabaseClient, projectId: string): Promise<AuditLogEntry[]> {
  const { data } = await supabase.from("ppm_history").select("*").eq("entity_type", "project").eq("entity_id", projectId).order("created_at", { ascending: false }).limit(100);
  return (data || []) as AuditLogEntry[];
}

// Sprint 23: Project closure
export async function getProjectClosure(supabase: SupabaseClient, projectId: string): Promise<ProjectClosure | null> {
  const { data } = await supabase.from("ppm_project_closures").select("*").eq("project_id", projectId).maybeSingle();
  return (data as ProjectClosure) || null;
}

// Execution add-on (Phase A+B): Achievements + the free-text "known people" directory
export async function listKnownPeople(supabase: SupabaseClient, project: Project): Promise<KnownPerson[]> {
  const [{ data: governanceRoles }, { data: activities }] = await Promise.all([
    supabase.from("ppm_governance_roles").select("name,email").eq("project_id", project.id),
    supabase.from("ppm_activities").select("responsible_name,responsible_email").eq("project_id", project.id),
  ]);
  const candidates: KnownPerson[] = [
    { name: project.project_manager_name || "", email: project.project_manager_email },
    { name: project.sponsor_name || "", email: project.sponsor_email },
    ...((governanceRoles || []) as { name: string; email?: string }[]),
    ...((activities || []) as { responsible_name?: string; responsible_email?: string }[])
      .map(row => ({ name: row.responsible_name || "", email: row.responsible_email })),
  ];
  const byKey = new Map<string, KnownPerson>();
  for (const person of candidates) {
    if (!person.name) continue;
    const key = person.email ? person.email.toLowerCase() : person.name.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, person);
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listMyActivities(supabase: SupabaseClient, projectId: string, email: string): Promise<Activity[]> {
  if (!email) return [];
  const { data } = await supabase.from("ppm_activities").select("*").eq("project_id", projectId).ilike("responsible_email", email).order("planned_end", { ascending: true, nullsFirst: false });
  return (data || []) as Activity[];
}

export async function listActivityAchievements(supabase: SupabaseClient, activityId: string): Promise<Achievement[]> {
  const { data } = await supabase.from("ppm_achievements").select("*").eq("activity_id", activityId).order("created_at", { ascending: false });
  return (data || []) as Achievement[];
}

export async function listMyAchievements(supabase: SupabaseClient, projectId: string, userId: string): Promise<Achievement[]> {
  const { data } = await supabase.from("ppm_achievements").select("*").eq("project_id", projectId).eq("created_by", userId).order("created_at", { ascending: false });
  return (data || []) as Achievement[];
}

export async function listAchievements(supabase: SupabaseClient, projectId: string): Promise<Achievement[]> {
  const { data } = await supabase.from("ppm_achievements").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as Achievement[];
}

export async function listAchievementEvidence(supabase: SupabaseClient, achievementId: string): Promise<AchievementEvidence[]> {
  const { data } = await supabase.from("ppm_achievement_evidence").select("*").eq("achievement_id", achievementId).order("created_at", { ascending: false });
  return (data || []) as AchievementEvidence[];
}

// Execution add-on: Activity 360 / Work Package 360 (Phase E) single-row lookups — every list
// used by those pages already exists project-wide (listActivities, listExpenses,
// listProcurementItems, etc.) and is filtered in the page itself, avoiding a narrow
// getXByActivity/getXByWorkPackage query per domain.
export async function getActivity(supabase: SupabaseClient, activityId: string): Promise<Activity | null> {
  const { data } = await supabase.from("ppm_activities").select("*").eq("id", activityId).maybeSingle();
  return (data as Activity) || null;
}

export async function getWbsNode(supabase: SupabaseClient, id: string): Promise<WBSNode | null> {
  const { data } = await supabase.from("ppm_wbs_nodes").select("*").eq("id", id).maybeSingle();
  return (data as WBSNode) || null;
}

// Phase D: Expenses
export async function listExpenses(supabase: SupabaseClient, projectId: string): Promise<Expense[]> {
  const { data } = await supabase.from("ppm_expenses").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as Expense[];
}

// Phase J: Resources — Timesheets + Equipment checkouts
export async function listTimesheets(supabase: SupabaseClient, projectId: string): Promise<Timesheet[]> {
  const { data } = await supabase.from("ppm_timesheets").select("*").eq("project_id", projectId).order("entry_date", { ascending: false });
  return (data || []) as Timesheet[];
}

export async function listEquipmentCheckouts(supabase: SupabaseClient, projectId: string): Promise<EquipmentCheckout[]> {
  const { data } = await supabase.from("ppm_equipment_checkouts").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as EquipmentCheckout[];
}

export async function listAssetInventorySessions(supabase: SupabaseClient, projectId: string): Promise<AssetInventorySession[]> {
  const { data } = await supabase.from("ppm_asset_inventory_sessions").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as AssetInventorySession[];
}

export async function listAssetInventoryLines(supabase: SupabaseClient, sessionId: string): Promise<AssetInventoryLine[]> {
  const { data } = await supabase.from("ppm_asset_inventory_lines").select("*").eq("session_id", sessionId);
  return (data || []) as AssetInventoryLine[];
}

// Phase K: Communication Actuals + Stakeholder Interactions
export async function listCommunicationActuals(supabase: SupabaseClient, projectId: string): Promise<CommunicationActual[]> {
  const { data } = await supabase.from("ppm_communication_actuals").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as CommunicationActual[];
}

export async function listStakeholderInteractions(supabase: SupabaseClient, projectId: string): Promise<StakeholderInteraction[]> {
  const { data } = await supabase.from("ppm_stakeholder_interactions").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as StakeholderInteraction[];
}

// Phase L: Action Tracker
export async function listActions(supabase: SupabaseClient, projectId: string): Promise<PPMAction[]> {
  const { data } = await supabase.from("ppm_actions").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data || []) as PPMAction[];
}

// EVM add-on (Wave 1)
export async function getEvmSettings(supabase: SupabaseClient, projectId: string): Promise<EvmSettings | null> {
  const { data } = await supabase.from("ppm_evm_settings").select("*").eq("project_id", projectId).maybeSingle();
  return (data as EvmSettings) || null;
}

export async function listTimePhasedBudgets(supabase: SupabaseClient, projectId: string): Promise<TimePhasedBudget[]> {
  const { data } = await supabase.from("ppm_time_phased_budgets").select("*").eq("project_id", projectId).order("period_date");
  return (data || []) as TimePhasedBudget[];
}

export async function listEvmSnapshots(supabase: SupabaseClient, projectId: string): Promise<EvmSnapshot[]> {
  const { data } = await supabase.from("ppm_evm_snapshots").select("*").eq("project_id", projectId).order("status_date");
  return (data || []) as EvmSnapshot[];
}

// EVM Wave 2: PMB versioning
export async function listPmbVersions(supabase: SupabaseClient, projectId: string): Promise<PmbVersion[]> {
  const { data } = await supabase.from("ppm_pmb_versions").select("*").eq("project_id", projectId).order("version", { ascending: false });
  return (data || []) as PmbVersion[];
}

export async function listPmbWorkPackageSnapshots(supabase: SupabaseClient, pmbVersionId: string): Promise<PmbWorkPackageSnapshot[]> {
  const { data } = await supabase.from("ppm_pmb_work_package_snapshots").select("*").eq("pmb_version_id", pmbVersionId);
  return (data || []) as PmbWorkPackageSnapshot[];
}

// Convenience for EVM's BAC resolution: the frozen per-Work-Package snapshots of whichever PMB
// version is currently "approved" (there is at most one at a time — see PmbVersionManager.tsx),
// or an empty array when no version has been approved yet (EVM then falls back to live budget lines).
export async function getApprovedPmbWorkPackageSnapshots(supabase: SupabaseClient, projectId: string): Promise<PmbWorkPackageSnapshot[]> {
  const { data: version } = await supabase.from("ppm_pmb_versions").select("id").eq("project_id", projectId).eq("status", "approved").maybeSingle();
  if (!version) return [];
  return listPmbWorkPackageSnapshots(supabase, version.id);
}
