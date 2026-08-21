// Sprint 20's dashboard and Sprint 25's AI report draft both need the same project-level
// aggregates — pulled out once here so the two never drift apart. Execution add-on Phase M
// extends this with the Validated-Actuals metrics for the Execution Control Center.
import type {
  Achievement, Activity, BudgetLine, Deliverable, Indicator, NonConformityReport, PPMAction,
  ProcurementItem, QualityRequirement, Risk,
} from "./types";

export function riskLevel(score: number) {
  if (score >= 20) return "Critique";
  if (score >= 12) return "Eleve";
  if (score >= 6) return "Modere";
  return "Faible";
}

export function computeBudgetSummary(budgetLines: BudgetLine[]) {
  const revised = budgetLines.reduce((sum, row) => sum + Number(row.revised_budget ?? row.initial_budget ?? 0), 0);
  const spent = budgetLines.reduce((sum, row) => sum + Number(row.spent_amount || 0), 0);
  const burnRate = revised > 0 ? Math.round((spent / revised) * 100) : 0;
  return { revised, spent, burnRate };
}

export function computeRiskSummary(risks: Risk[]) {
  const open = risks.filter(risk => risk.status !== "closed");
  const counts: Record<string, number> = { Faible: 0, Modere: 0, Eleve: 0, Critique: 0 };
  open.forEach(risk => { counts[riskLevel(risk.probability * risk.impact)] += 1; });
  return { counts, criticalCount: counts.Critique, openCount: open.length };
}

export function computeActivitySummary(activities: Activity[]) {
  const completed = activities.filter(activity => activity.status === "completed").length;
  const percent = activities.length ? Math.round((completed / activities.length) * 100) : 0;
  return { completed, total: activities.length, percent };
}

export function computeQualityConformRate(qualityRequirements: QualityRequirement[]) {
  if (!qualityRequirements.length) return null;
  return Math.round((qualityRequirements.filter(item => item.result === "conforme").length / qualityRequirements.length) * 100);
}

export function computeIndicatorProgress(indicators: Indicator[]) {
  const withTarget = indicators.filter(item => item.target != null && item.target !== 0 && item.current_value != null);
  if (!withTarget.length) return null;
  const average = withTarget.reduce((sum, item) => sum + Math.min(1, Number(item.current_value) / Number(item.target)), 0) / withTarget.length;
  return Math.round(average * 100);
}

export function countProcurementOngoing(items: ProcurementItem[]) {
  return items.filter(item => item.stage !== "completed" && item.stage !== "cancelled").length;
}

export function countOpenNcrs(ncrs: NonConformityReport[]) {
  return ncrs.filter(ncr => ncr.status !== "closed").length;
}

// Phase M: Execution Control Center + Plan vs Actual
export function computeQualityPerformedRate(qualityRequirements: QualityRequirement[]) {
  if (!qualityRequirements.length) return null;
  return Math.round((qualityRequirements.filter(item => item.result !== "pending").length / qualityRequirements.length) * 100);
}

export function computeAchievementSummary(achievements: Achievement[]) {
  const validated = achievements.filter(item => item.status === "validated");
  const beneficiariesReached = validated.reduce((sum, item) => sum + Number(item.beneficiaries_cumulative || 0), 0);
  return { validatedCount: validated.length, totalCount: achievements.length, beneficiariesReached };
}

export function computeDeliverableSummary(deliverables: Deliverable[]) {
  const accepted = deliverables.filter(item => item.acceptance_status === "accepted").length;
  return { accepted, total: deliverables.length };
}

export function countProcurementCompleted(items: ProcurementItem[]) {
  return items.filter(item => item.stage === "completed").length;
}

export function countOverdueActions(actions: PPMAction[]) {
  const today = new Date().toISOString().slice(0, 10);
  return actions.filter(item => item.due_date && item.due_date < today && !["completed", "verified", "closed"].includes(item.status)).length;
}

// A large financial-execution-vs-physical-progress gap is a signal to investigate, not proof
// of an anomaly (spec section 32) — threshold is a simple constant here, not yet configurable
// per organization.
export const EXECUTION_GAP_THRESHOLD = 20;
