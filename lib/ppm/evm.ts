// EVM add-on (Wave 1) — the only place Earned Value formulas live. Every component and API
// route imports from here rather than recomputing; an AI narrative may comment on the numbers
// this file produces but must never recalculate them (spec section 28).
import type {
  Achievement, Activity, BudgetLine, EacMethod, EvMethod, EvmMetrics, EvmSettings, Expense,
  PmbWorkPackageSnapshot, TimePhasedBudget, WBSNode,
} from "./types";

function toTime(date: string) { return new Date(date).getTime(); }

// Picks the latest validated achievement as of a given date and returns a 0-100 percent,
// falling back to the activity's own progress_percent/status when no achievement exists yet
// (so EVM degrades gracefully rather than showing nothing — spec section 32).
function rawPercentComplete(activity: Activity, achievements: Achievement[], asOfDate: string): number {
  const validated = achievements
    .filter(item => item.status === "validated" && item.activity_id === activity.id)
    .filter(item => !item.achievement_date || item.achievement_date <= asOfDate)
    .sort((a, b) => toTime(b.achievement_date || b.validated_at || b.created_at) - toTime(a.achievement_date || a.validated_at || a.created_at));
  if (validated.length) {
    const latest = validated[0];
    if (activity.ev_method === "units_complete" && activity.beneficiaries && latest.beneficiaries_cumulative != null) {
      return Math.min(100, (latest.beneficiaries_cumulative / activity.beneficiaries) * 100);
    }
    return Math.min(100, Math.max(0, Number(latest.progress_percent ?? 0)));
  }
  // No validated achievement yet: fall back to the activity's own manually-tracked fields.
  if (activity.status === "completed") return 100;
  if (activity.progress_percent != null) return Math.min(100, Math.max(0, activity.progress_percent));
  if (activity.status === "in_progress" || activity.status === "delayed" || activity.status === "blocked") return 0;
  return 0;
}

// Milestone-Weighted: each named milestone on the activity carries its own weight; percent
// complete is the share of weight already completed as of a given date (a milestone's own
// completed_date gates it for historical S-Curve points, same as achievements elsewhere).
function milestoneWeightedPercent(activity: Activity, asOfDate: string): number {
  const milestones = activity.milestone_weights || [];
  const totalWeight = milestones.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (!totalWeight) return 0;
  const completedWeight = milestones
    .filter(item => item.completed && (!item.completed_date || item.completed_date <= asOfDate))
    .reduce((sum, item) => sum + Number(item.weight || 0), 0);
  return Math.min(100, (completedWeight / totalWeight) * 100);
}

export function activityPercentComplete(activity: Activity, achievements: Achievement[], asOfDate: string): number {
  if (activity.ev_method === "milestone_weighted") return milestoneWeightedPercent(activity, asOfDate);
  const raw = rawPercentComplete(activity, achievements, asOfDate);
  const hasStarted = raw > 0 || (activity.status !== "not_started" && (!activity.actual_start || activity.actual_start <= asOfDate));
  const isComplete = raw >= 100;
  switch (activity.ev_method as EvMethod) {
    case "0_100": return isComplete ? 100 : 0;
    case "50_50": return isComplete ? 100 : hasStarted ? 50 : 0;
    case "20_80": return isComplete ? 100 : hasStarted ? 20 : 0;
    case "units_complete":
    case "percent_complete":
    default: return raw;
  }
}

// Fallback PV when a Work Package has no time-phased budget entered: linear proration of the
// activity's budget between its planned dates, evaluated at the status date.
export function activityLinearPv(activity: Activity, asOfDate: string): number {
  const budget = Number(activity.planned_budget || 0);
  if (!budget || !activity.planned_start || !activity.planned_end) return 0;
  const start = toTime(activity.planned_start);
  const end = toTime(activity.planned_end);
  const asOf = toTime(asOfDate);
  if (end <= start) return asOf >= end ? budget : 0;
  if (asOf <= start) return 0;
  if (asOf >= end) return budget;
  return budget * ((asOf - start) / (end - start));
}

export function workPackageTimePhasedPv(rows: TimePhasedBudget[], asOfDate: string): number {
  return rows.filter(row => row.period_date <= asOfDate).reduce((sum, row) => sum + Number(row.planned_amount || 0), 0);
}

function actualCost(expenses: Expense[], asOfDate: string): number {
  return expenses
    .filter(item => item.status === "posted" && (!item.expense_date || item.expense_date <= asOfDate))
    .reduce((sum, item) => sum + Number(item.converted_amount ?? item.amount_incl_tax ?? 0), 0);
}

// Core aggregator — works for any scope (one Work Package or a whole project) as long as the
// caller pre-filters activities/achievements/expenses/timePhasedRows to that scope.
export function computeEvm({ activities, achievements, expenses, timePhasedRows, bac, bacSource, asOfDate }: {
  activities: Activity[]; achievements: Achievement[]; expenses: Expense[]; timePhasedRows: TimePhasedBudget[];
  bac: number; bacSource?: "pmb" | "live_budget"; asOfDate: string;
}): EvmMetrics {
  let ev = 0;
  let pvLinear = 0;
  for (const activity of activities) {
    const percent = activityPercentComplete(activity, achievements, asOfDate);
    ev += Number(activity.planned_budget || 0) * (percent / 100);
    pvLinear += activityLinearPv(activity, asOfDate);
  }
  const hasTimePhased = timePhasedRows.length > 0;
  const pv = hasTimePhased ? workPackageTimePhasedPv(timePhasedRows, asOfDate) : pvLinear;
  const ac = actualCost(expenses, asOfDate);
  const sv = ev - pv;
  const cv = ev - ac;
  return { bac, bacSource, pv, pvSource: hasTimePhased ? "time_phased" : "linear_estimate", ev, ac, sv, cv, spi: pv > 0 ? ev / pv : null, cpi: ac > 0 ? ev / ac : null };
}

// Rolls up several already-computed scopes (e.g. one per Work Package) into a project total.
export function rollupEvm(scopes: EvmMetrics[]): EvmMetrics {
  const bac = scopes.reduce((sum, item) => sum + item.bac, 0);
  const pv = scopes.reduce((sum, item) => sum + item.pv, 0);
  const ev = scopes.reduce((sum, item) => sum + item.ev, 0);
  const ac = scopes.reduce((sum, item) => sum + item.ac, 0);
  const sources = new Set(scopes.map(item => item.pvSource));
  const pvSource = sources.size === 0 ? "linear_estimate" : sources.size === 1 ? [...sources][0] : "mixed";
  const bacSources = new Set(scopes.map(item => item.bacSource).filter(Boolean));
  const bacSource = bacSources.size === 1 ? [...bacSources][0] as "pmb" | "live_budget" : undefined;
  return { bac, bacSource, pv, pvSource, ev, ac, sv: ev - pv, cv: ev - ac, spi: pv > 0 ? ev / pv : null, cpi: ac > 0 ? ev / ac : null };
}

export function computeEac(bac: number, ac: number, ev: number, cpi: number | null, spi: number | null, method: EacMethod): number | null {
  if (method === "cpi") return cpi && cpi > 0 ? bac / cpi : null;
  if (method === "budgeted_rate") return ac + (bac - ev);
  if (method === "cpi_spi") return cpi && spi && cpi * spi > 0 ? ac + (bac - ev) / (cpi * spi) : null;
  return null;
}

export function computeEtc(eac: number | null, ac: number): number | null { return eac != null ? eac - ac : null; }
export function computeVac(bac: number, eac: number | null): number | null { return eac != null ? bac - eac : null; }

export function computeTcpiBac(bac: number, ev: number, ac: number): number | null {
  const denominator = bac - ac;
  return denominator !== 0 ? (bac - ev) / denominator : null;
}
export function computeTcpiEac(bac: number, ev: number, ac: number, eac: number | null): number | null {
  if (eac == null) return null;
  const denominator = eac - ac;
  return denominator !== 0 ? (bac - ev) / denominator : null;
}

export function evmStatusColor(value: number | null, greenThreshold: number, orangeThreshold: number): "green" | "orange" | "red" | "unknown" {
  if (value == null) return "unknown";
  if (value >= greenThreshold) return "green";
  if (value >= orangeThreshold) return "orange";
  return "red";
}

// One month-start series point per calendar month from `startDate` to `asOfDate` inclusive —
// reuses the exact same functions as the "right now" KPIs, so the S-Curve is never a separate
// model (spec section 19).
export function computeMonthlySeries({ activities, achievements, expenses, timePhasedRows, startDate, asOfDate }: {
  activities: Activity[]; achievements: Achievement[]; expenses: Expense[]; timePhasedRows: TimePhasedBudget[];
  startDate: string; asOfDate: string;
}): { month: string; pv: number; ev: number; ac: number }[] {
  const points: { month: string; pv: number; ev: number; ac: number }[] = [];
  const cursor = new Date(startDate);
  cursor.setDate(1);
  const end = new Date(asOfDate);
  let guard = 0;
  while (cursor <= end && guard < 120) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).toISOString().slice(0, 10);
    const asOf = monthEnd > asOfDate ? asOfDate : monthEnd;
    let ev = 0;
    let pvLinear = 0;
    for (const activity of activities) {
      const percent = activityPercentComplete(activity, achievements, asOf);
      ev += Number(activity.planned_budget || 0) * (percent / 100);
      pvLinear += activityLinearPv(activity, asOf);
    }
    const pv = timePhasedRows.length ? workPackageTimePhasedPv(timePhasedRows, asOf) : pvLinear;
    points.push({ month: cursor.toISOString().slice(0, 7), pv, ev, ac: actualCost(expenses, asOf) });
    cursor.setMonth(cursor.getMonth() + 1);
    guard += 1;
  }
  return points;
}

// EVM Wave 2: BAC comes from the latest approved PMB snapshot for this Work Package when one
// exists (the frozen, controlled baseline); otherwise it falls back to summing the live
// ppm_budget_lines rows (Wave 1 behaviour) — always tell the caller which source was used.
export function resolveWorkPackageBac(workPackageId: string, budgetLines: BudgetLine[], latestApprovedSnapshots: PmbWorkPackageSnapshot[]): { bac: number; source: "pmb" | "live_budget" } {
  const snapshot = latestApprovedSnapshots.find(item => item.work_package_id === workPackageId);
  if (snapshot) return { bac: Number(snapshot.bac || 0), source: "pmb" };
  const bac = budgetLines.filter(line => line.wbs_node_id === workPackageId).reduce((sum, line) => sum + Number(line.revised_budget ?? line.initial_budget ?? 0), 0);
  return { bac, source: "live_budget" };
}

// Whole-project rollup: loops every Work Package (resolving BAC from an approved PMB snapshot
// when available) plus activities with no Work Package, then rolls everything up. Used by the
// Programme/Portfolio pages (Wave 3) to aggregate several projects without each one re-deriving
// this loop — EvmDashboard.tsx/the insights route keep their own copy since they also need the
// per-Work-Package breakdown for the exception list, not just the total.
export function computeProjectEvm({ workPackages, activities, achievements, expenses, budgetLines, timePhasedRows, pmbSnapshots, asOfDate }: {
  workPackages: WBSNode[]; activities: Activity[]; achievements: Achievement[]; expenses: Expense[];
  budgetLines: BudgetLine[]; timePhasedRows: TimePhasedBudget[]; pmbSnapshots: PmbWorkPackageSnapshot[]; asOfDate: string;
}): EvmMetrics {
  const scopes: EvmMetrics[] = workPackages.map(wp => {
    const wpActivities = activities.filter(activity => activity.work_package_id === wp.id);
    const activityIds = new Set(wpActivities.map(activity => activity.id));
    const wpExpenses = expenses.filter(item => item.work_package_id === wp.id || (item.activity_id && activityIds.has(item.activity_id)));
    const wpTimePhased = timePhasedRows.filter(row => row.work_package_id === wp.id);
    const { bac, source } = resolveWorkPackageBac(wp.id, budgetLines, pmbSnapshots);
    return computeEvm({ activities: wpActivities, achievements, expenses: wpExpenses, timePhasedRows: wpTimePhased, bac, bacSource: source, asOfDate });
  });
  const unassignedActivities = activities.filter(activity => !activity.work_package_id);
  if (unassignedActivities.length) {
    const bac = budgetLines.filter(line => !line.wbs_node_id).reduce((sum, line) => sum + Number(line.revised_budget ?? line.initial_budget ?? 0), 0);
    scopes.push(computeEvm({
      activities: unassignedActivities, achievements,
      expenses: expenses.filter(item => !item.work_package_id && (!item.activity_id || unassignedActivities.some(a => a.id === item.activity_id))),
      timePhasedRows: [], bac, bacSource: "live_budget", asOfDate,
    }));
  }
  return rollupEvm(scopes);
}

// Never render a KPI computed from insufficient data (spec section 32) — return the specific
// gaps instead, so the UI can show "EVM non disponible : ..." rather than a misleading number.
export function checkEvmDataSufficiency({ settings, workPackages, budgetLines, activities }: {
  settings: EvmSettings | null; workPackages: WBSNode[]; budgetLines: BudgetLine[]; activities: Activity[];
}): string[] {
  const gaps: string[] = [];
  if (!settings || !settings.enabled) gaps.push("L'Earned Value Management n'est pas active pour ce projet.");
  const budgetedWpIds = new Set(budgetLines.map(line => line.wbs_node_id).filter(Boolean));
  const workPackagesWithoutBudget = workPackages.filter(wp => !budgetedWpIds.has(wp.id));
  if (workPackagesWithoutBudget.length) gaps.push(`${workPackagesWithoutBudget.length} Work Package(s) ne disposent pas encore d'une ligne budgetaire.`);
  const datedActivities = activities.filter(activity => activity.planned_start && activity.planned_end);
  if (activities.length && !datedActivities.length) gaps.push("Aucune activite n'a de dates de debut/fin prevues (necessaire au PV estime).");
  return gaps;
}
