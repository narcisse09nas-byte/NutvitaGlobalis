"use client";
import { useState } from "react";
import EvmSettingsForm from "@/components/op-management/EvmSettingsForm";
import TimePhasedBudgetForm from "@/components/op-management/TimePhasedBudgetForm";
import EvmDashboard from "@/components/op-management/EvmDashboard";
import PmbVersionManager from "@/components/op-management/PmbVersionManager";
import type {
  Achievement, Activity, BudgetLine, ChangeRequest, EvmSettings, EvmSnapshot, Expense, Issue,
  PmbVersion, PmbWorkPackageSnapshot, Project, Risk, TimePhasedBudget, WBSNode,
} from "@/lib/ppm/types";

type View = "dashboard" | "settings" | "time-phased" | "pmb";

export default function EvmWorkspace({ projectId, project, initialSettings, workPackages, budgetLines, activities, achievements, expenses, timePhasedRows, risks, issues, initialSnapshots, changeRequests, initialPmbVersions, pmbSnapshots }: {
  projectId: string; project: Project; initialSettings: EvmSettings | null; workPackages: WBSNode[]; budgetLines: BudgetLine[];
  activities: Activity[]; achievements: Achievement[]; expenses: Expense[]; timePhasedRows: TimePhasedBudget[];
  risks: Risk[]; issues: Issue[]; initialSnapshots: EvmSnapshot[]; changeRequests: ChangeRequest[]; initialPmbVersions: PmbVersion[];
  pmbSnapshots: PmbWorkPackageSnapshot[];
}) {
  const [view, setView] = useState<View>(initialSettings?.enabled ? "dashboard" : "settings");
  const [settings, setSettings] = useState(initialSettings);

  return <div className="grid gap-5">
    <div className="flex flex-wrap gap-2">
      {([["dashboard", "Tableau de bord"], ["time-phased", "Budget mensualise"], ["pmb", "PMB"], ["settings", "Parametres"]] as const).map(([value, label]) => <button key={value} onClick={() => setView(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${view === value ? "bg-forest text-white" : "bg-slate-100 text-slate-600 hover:bg-mint"}`}>{label}</button>)}
    </div>

    {view === "settings" && <EvmSettingsForm projectId={projectId} initial={settings} onSaved={setSettings} />}
    {view === "time-phased" && <TimePhasedBudgetForm projectId={projectId} project={project} workPackages={workPackages} budgetLines={budgetLines} activities={activities} initial={timePhasedRows} />}
    {view === "pmb" && <PmbVersionManager projectId={projectId} workPackages={workPackages} budgetLines={budgetLines} activities={activities} changeRequests={changeRequests} initial={initialPmbVersions} />}
    {view === "dashboard" && <EvmDashboard
      projectId={projectId} project={project} settings={settings} workPackages={workPackages} budgetLines={budgetLines}
      activities={activities} achievements={achievements} expenses={expenses} timePhasedRows={timePhasedRows}
      risks={risks} issues={issues} initialSnapshots={initialSnapshots} pmbSnapshots={pmbSnapshots}
    />}
  </div>;
}
