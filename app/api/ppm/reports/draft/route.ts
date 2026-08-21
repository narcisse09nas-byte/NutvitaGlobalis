import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStructured } from "@/lib/ai-narrative";
import {
  getProject, listActions, listActivities, listAchievements, listBudgetLines,
  listCommunicationActuals, listDeliverables, listExpenses, listIndicators, listIssues, listNcrs,
  listProcurementItems, listQualityRequirements, listRisks, listStakeholderInteractions, listStakeholders,
} from "@/lib/ppm/queries";
import {
  computeAchievementSummary, computeActivitySummary, computeBudgetSummary, computeDeliverableSummary,
  computeIndicatorProgress, computeQualityConformRate, computeQualityPerformedRate, computeRiskSummary,
  countOpenNcrs, countOverdueActions, countProcurementCompleted, countProcurementOngoing,
} from "@/lib/ppm/dashboard-metrics";

// Sprint 25 (IA): drafts a report from the same deterministic metrics as the Sprint 20
// dashboard — the model narrates numbers it is given, it never invents or recalculates them
// (same guardrail as lib/ai-narrative.ts's health/growth reports).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId = String(body.project_id || "");
  if (!projectId) return NextResponse.json({ message: "Projet manquant." }, { status: 400 });

  const project = await getProject(supabase, projectId);
  if (!project) return NextResponse.json({ message: "Projet introuvable ou acces refuse." }, { status: 404 });

  const [budgetLines, risks, issues, activities, procurementItems, qualityRequirements, ncrs, indicators, achievements, deliverables, actions, expenses, stakeholders, stakeholderInteractions, communicationActuals] = await Promise.all([
    listBudgetLines(supabase, projectId), listRisks(supabase, projectId), listIssues(supabase, projectId),
    listActivities(supabase, projectId), listProcurementItems(supabase, projectId),
    listQualityRequirements(supabase, projectId), listNcrs(supabase, projectId), listIndicators(supabase, projectId),
    listAchievements(supabase, projectId), listDeliverables(supabase, projectId), listActions(supabase, projectId),
    listExpenses(supabase, projectId), listStakeholders(supabase, projectId),
    listStakeholderInteractions(supabase, projectId), listCommunicationActuals(supabase, projectId),
  ]);

  const budget = computeBudgetSummary(budgetLines);
  const riskSummary = computeRiskSummary(risks);
  const activitySummary = computeActivitySummary(activities);
  const achievementSummary = computeAchievementSummary(achievements);
  const deliverableSummary = computeDeliverableSummary(deliverables);
  // Only validated achievements / posted expenses / accepted deliverables / performed quality
  // controls feed this draft — never planned or unvalidated declarations (spec section 36).
  const metrics = {
    projectName: project.name,
    budgetRevised: budget.revised,
    budgetSpent: budget.spent,
    burnRatePercent: budget.burnRate,
    postedExpensesTotal: expenses.filter(item => item.status === "posted").reduce((sum, item) => sum + Number(item.converted_amount ?? item.amount_incl_tax), 0),
    currency: project.currency || "XAF",
    openRisksByLevel: riskSummary.counts,
    criticalRisksCount: riskSummary.criticalCount,
    openIssuesCount: issues.filter(issue => issue.status === "open" || issue.status === "in_progress").length,
    activitiesCompleted: activitySummary.completed,
    activitiesTotal: activitySummary.total,
    activitiesProgressPercent: activitySummary.percent,
    validatedAchievementsCount: achievementSummary.validatedCount,
    reportedAchievementsCount: achievementSummary.totalCount,
    beneficiariesReached: achievementSummary.beneficiariesReached,
    acceptedDeliverablesCount: deliverableSummary.accepted,
    totalDeliverablesCount: deliverableSummary.total,
    procurementOngoingCount: countProcurementOngoing(procurementItems),
    procurementCompletedCount: countProcurementCompleted(procurementItems),
    openNonConformitiesCount: countOpenNcrs(ncrs),
    qualityConformRatePercent: computeQualityConformRate(qualityRequirements),
    qualityPerformedRatePercent: computeQualityPerformedRate(qualityRequirements),
    indicatorsAverageProgressPercent: computeIndicatorProgress(indicators),
    overdueActionsCount: countOverdueActions(actions),
    stakeholdersCount: stakeholders.length,
    stakeholderInteractionsCount: stakeholderInteractions.length,
    communicationActualsCompletedCount: communicationActuals.filter(item => item.status !== "draft").length,
  };

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      achievements: { type: "string" },
      challenges: { type: "string" },
      next_steps: { type: "string" },
      financial_summary: { type: "string" },
    },
    required: ["summary", "achievements", "challenges", "next_steps", "financial_summary"],
  };

  const result = await generateStructured<{ summary: string; achievements: string; challenges: string; next_steps: string; financial_summary: string }>(
    "ppm_project_report_draft",
    [
      "Vous redigez un brouillon de rapport de suivi de projet pour une ONG (methodologie PMBOK / cadre logique).",
      "Utilisez uniquement les indicateurs chiffres fournis : ce sont des donnees deja validees (realisations validees, depenses postees, livrables acceptes, controles qualite realises) — ne recalculez rien et n'inventez aucune donnee absente.",
      "Produisez 5 paragraphes courts et factuels en francais : summary (resume executif), achievements (realisations), challenges (difficultes), next_steps (prochaines etapes), financial_summary (situation budgetaire).",
      "Restez prudent et factuel : ce texte est un brouillon qu'un charge de projet va relire et corriger avant publication.",
    ].join("\n"),
    metrics,
    schema,
  );

  if (!result.data) return NextResponse.json({ message: `Assistant IA indisponible (${result.error || "raison inconnue"}).` }, { status: 502 });
  return NextResponse.json({ ok: true, draft: result.data });
}
