"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type {
  Achievement, Activity, BudgetLine, Deliverable, EvmSettings, Expense, Indicator,
  NonConformityReport, PmbWorkPackageSnapshot, PPMAction, ProcurementItem, Project,
  QualityRequirement, Risk, TimePhasedBudget,
} from "@/lib/ppm/types";
import {
  computeAchievementSummary, computeActivitySummary, computeBudgetSummary, computeDeliverableSummary,
  computeIndicatorProgress, computeQualityConformRate, computeQualityPerformedRate, computeRiskSummary,
  countOpenNcrs, countOverdueActions, countProcurementCompleted, countProcurementOngoing, EXECUTION_GAP_THRESHOLD,
} from "@/lib/ppm/dashboard-metrics";
import { computeEac, computeEvm } from "@/lib/ppm/evm";

const COLORS = { forest: "#123c2f", leaf: "#1f7a55", mint: "#8fd4b6", orange: "#e87d3e", red: "#dc2626", slate: "#94a3b8" };

export default function ProjectDashboard({ project, budgetLines, risks, issuesOpenCount, activities, procurementItems, qualityRequirements, ncrs, indicators, achievements, deliverables, actions, targetBeneficiaries, expenses, timePhasedRows, evmSettings, pmbSnapshots }: {
  project: Project; budgetLines: BudgetLine[]; risks: Risk[]; issuesOpenCount: number; activities: Activity[];
  procurementItems: ProcurementItem[]; qualityRequirements: QualityRequirement[]; ncrs: NonConformityReport[]; indicators: Indicator[];
  achievements: Achievement[]; deliverables: Deliverable[]; actions: PPMAction[]; targetBeneficiaries: number;
  expenses: Expense[]; timePhasedRows: TimePhasedBudget[]; evmSettings: EvmSettings | null; pmbSnapshots: PmbWorkPackageSnapshot[];
}) {
  const budget = useMemo(() => computeBudgetSummary(budgetLines), [budgetLines]);

  const riskDistribution = useMemo(() => {
    const { counts } = computeRiskSummary(risks);
    return [
      { name: "Faible", value: counts.Faible, fill: COLORS.mint },
      { name: "Modere", value: counts.Modere, fill: COLORS.leaf },
      { name: "Eleve", value: counts.Eleve, fill: COLORS.orange },
      { name: "Critique", value: counts.Critique, fill: COLORS.red },
    ].filter(item => item.value > 0);
  }, [risks]);
  const criticalRisks = useMemo(() => computeRiskSummary(risks).criticalCount, [risks]);

  const activityStatusData = useMemo(() => {
    const labels: Record<string, string> = { not_started: "Non demarre", in_progress: "En cours", completed: "Termine", delayed: "En retard", blocked: "Bloque", cancelled: "Annule" };
    const counts: Record<string, number> = {};
    activities.forEach(activity => { counts[activity.status] = (counts[activity.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({ name: labels[status] || status, value }));
  }, [activities]);
  const activitySummary = useMemo(() => computeActivitySummary(activities), [activities]);

  const procurementOngoing = useMemo(() => countProcurementOngoing(procurementItems), [procurementItems]);
  const openNcrs = useMemo(() => countOpenNcrs(ncrs), [ncrs]);
  const qualityConformRate = useMemo(() => computeQualityConformRate(qualityRequirements), [qualityRequirements]);
  const qualityPerformedRate = useMemo(() => computeQualityPerformedRate(qualityRequirements), [qualityRequirements]);
  const indicatorProgress = useMemo(() => computeIndicatorProgress(indicators), [indicators]);
  const achievementSummary = useMemo(() => computeAchievementSummary(achievements), [achievements]);
  const deliverableSummary = useMemo(() => computeDeliverableSummary(deliverables), [deliverables]);
  const procurementCompleted = useMemo(() => countProcurementCompleted(procurementItems), [procurementItems]);
  const overdueActions = useMemo(() => countOverdueActions(actions), [actions]);
  const executionGap = budget.burnRate - activitySummary.percent;

  const statusDate = evmSettings?.status_date || new Date().toISOString().slice(0, 10);
  const pmbBac = pmbSnapshots.length ? pmbSnapshots.reduce((sum, item) => sum + Number(item.bac || 0), 0) : null;
  const evm = evmSettings?.enabled ? computeEvm({ activities, achievements, expenses, timePhasedRows, bac: pmbBac ?? budget.revised, bacSource: pmbBac != null ? "pmb" : "live_budget", asOfDate: statusDate }) : null;
  const forecastCost = evm ? computeEac(evm.bac, evm.ac, evm.ev, evm.cpi, evm.spi, "cpi") : null;
  let forecastDeltaMonths: number | null = null;
  if (evm?.spi && project.start_date && project.end_date) {
    const plannedDays = (+new Date(project.end_date) - +new Date(project.start_date)) / 86400000;
    const forecastDays = plannedDays / evm.spi;
    forecastDeltaMonths = Math.round(((forecastDays - plannedDays) / 30.44) * 10) / 10;
  }

  return <div className="grid gap-5">
    <div>
      <h2 className="text-lg font-black text-forest">Execution Control Center</h2>
      <p className="text-sm text-slate-500">Vue consolidee a partir des donnees validees (Plan vs Actual).</p>
    </div>

    {Math.abs(executionGap) >= EXECUTION_GAP_THRESHOLD && <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
      ⚠ L&apos;execution financiere est {Math.abs(executionGap)} points de pourcentage {executionGap > 0 ? "au-dessus" : "en-dessous"} de la progression physique. Ceci est un signal a analyser, pas necessairement une anomalie.
    </div>}

    {evm && <div className="rounded-2xl border bg-white p-5">
      <h3 className="text-sm font-black uppercase text-slate-500">Performance (Earned Value Management)</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <p>Progression physique<br /><b className="text-lg text-forest">{activitySummary.percent}%</b></p>
        <p>Execution financiere<br /><b className="text-lg text-forest">{budget.burnRate}%</b></p>
        <p>SPI<br /><b className="text-lg text-forest">{evm.spi != null ? evm.spi.toFixed(2) : "—"}</b></p>
        <p>CPI<br /><b className="text-lg text-forest">{evm.cpi != null ? evm.cpi.toFixed(2) : "—"}</b></p>
        <p>Prevision d&apos;achevement<br /><b className="text-lg text-forest">{forecastDeltaMonths != null ? `${forecastDeltaMonths > 0 ? "+" : ""}${forecastDeltaMonths} mois` : "—"}</b></p>
        <p>Cout previsionnel (EAC)<br /><b className="text-lg text-forest">{forecastCost != null ? forecastCost.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : "—"}</b></p>
      </div>
    </div>}

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Progression physique</p><b className="mt-2 block text-2xl text-forest">{activitySummary.percent}%</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Execution financiere</p><b className="mt-2 block text-2xl text-forest">{budget.burnRate}%</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Realisations validees</p><b className="mt-2 block text-2xl text-forest">{achievementSummary.validatedCount}</b><p className="mt-1 text-xs text-slate-400">/ {achievementSummary.totalCount} rapportees</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Beneficiaires</p><b className="mt-2 block text-2xl text-forest">{achievementSummary.beneficiariesReached.toLocaleString("fr-FR")}</b><p className="mt-1 text-xs text-slate-400">/ {targetBeneficiaries.toLocaleString("fr-FR")} cibles</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Livrables</p><b className="mt-2 block text-2xl text-forest">{deliverableSummary.accepted} / {deliverableSummary.total}</b><p className="mt-1 text-xs text-slate-400">acceptes</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Procurements</p><b className="mt-2 block text-2xl text-forest">{procurementCompleted} / {procurementItems.length}</b><p className="mt-1 text-xs text-slate-400">termines</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Controles qualite</p><b className="mt-2 block text-2xl text-forest">{qualityPerformedRate != null ? `${qualityPerformedRate}%` : "—"}</b><p className="mt-1 text-xs text-slate-400">realises</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Actions en retard</p><b className={`mt-2 block text-2xl ${overdueActions ? "text-red-600" : "text-forest"}`}>{overdueActions}</b></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Budget · Burn rate</p><b className="mt-2 block text-2xl text-forest">{budget.burnRate}%</b><p className="mt-1 text-xs text-slate-400">{budget.spent.toLocaleString("fr-FR")} / {budget.revised.toLocaleString("fr-FR")}</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Risques critiques</p><b className={`mt-2 block text-2xl ${criticalRisks ? "text-red-600" : "text-forest"}`}>{criticalRisks}</b><p className="mt-1 text-xs text-slate-400">Issues ouvertes : {issuesOpenCount}</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Activites terminees</p><b className="mt-2 block text-2xl text-forest">{activitySummary.percent}%</b><p className="mt-1 text-xs text-slate-400">{activitySummary.completed} / {activitySummary.total}</p></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">Qualite</p><b className="mt-2 block text-2xl text-forest">{qualityConformRate != null ? `${qualityConformRate}%` : "—"}</b><p className="mt-1 text-xs text-slate-400">NCR ouvertes : {openNcrs} · Achats en cours : {procurementOngoing}</p></div>
    </div>

    {indicatorProgress != null && <div className="rounded-2xl border bg-white p-5">
      <p className="text-xs font-bold uppercase text-slate-400">Progression moyenne des indicateurs (realise / cible)</p>
      <div className="mt-3 h-3 w-full rounded-full bg-slate-100"><div className="h-3 rounded-full bg-leaf" style={{ width: `${indicatorProgress}%` }} /></div>
      <p className="mt-2 text-sm font-bold text-forest">{indicatorProgress}%</p>
    </div>}

    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="text-sm font-black uppercase text-slate-500">Repartition des risques par niveau</h3>
        {riskDistribution.length ? <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={riskDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {riskDistribution.map(entry => <Cell key={entry.name} fill={entry.fill} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer></div> : <p className="mt-4 text-center text-sm text-slate-400">Aucun risque ouvert.</p>}
      </div>
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="text-sm font-black uppercase text-slate-500">Activites par statut</h3>
        {activityStatusData.length ? <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={activityStatusData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} />
            <Tooltip /><Bar dataKey="value" fill={COLORS.leaf} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer></div> : <p className="mt-4 text-center text-sm text-slate-400">Aucune activite enregistree.</p>}
      </div>
    </div>
  </div>;
}
