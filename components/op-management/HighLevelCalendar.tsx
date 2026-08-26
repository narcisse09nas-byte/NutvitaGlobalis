"use client";
// Refinement program, Wave 2: a higher-level, period-bucketed rollup over the same Activity
// data the detailed per-day Gantt (PDMWorkspace.tsx) already renders — visible earlier, at
// Cadrage time, before/alongside the detailed PDM planning.
import { useMemo, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import ActivityFormModal, { type ActivityEditTarget } from "@/components/op-management/ActivityFormModal";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, Indicator, KnownPerson, ResultChainNode, WBSNode } from "@/lib/ppm/types";

type Granularity = "week" | "month" | "quarter" | "year";

function periodKey(date: Date, granularity: Granularity): string {
  if (granularity === "year") return `${date.getFullYear()}`;
  if (granularity === "quarter") return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  if (granularity === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((+date - +firstJan) / 86400000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function periodLabel(key: string, granularity: Granularity, en: boolean): string {
  if (granularity === "year" || granularity === "week") return key;
  if (granularity === "quarter") return key.replace("-", " ");
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(en ? "en-US" : "fr-FR", { month: "short", year: "numeric" });
}

function nextPeriod(date: Date, granularity: Granularity): Date {
  const next = new Date(date);
  if (granularity === "year") next.setFullYear(next.getFullYear() + 1);
  else if (granularity === "quarter") next.setMonth(next.getMonth() + 3);
  else if (granularity === "month") next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return next;
}

export default function HighLevelCalendar({ projectId, initial, workPackages, outputs, indicators, knownPeople }: {
  projectId: string; initial: Activity[]; workPackages: WBSNode[]; outputs: ResultChainNode[]; indicators: Indicator[]; knownPeople: KnownPerson[];
}) {
  const { en } = usePpmLocale();
  const [activities, setActivities] = useState(initial);
  const [editing, setEditing] = useState<ActivityEditTarget>(null);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const dated = useMemo(() => activities.filter(row => row.planned_start && row.planned_end), [activities]);
  const activityCode = (row: Activity) => row.code || `ACT-${String([...activities].sort((a, b) => a.created_at.localeCompare(b.created_at)).findIndex(item => item.id === row.id) + 1).padStart(2, "0")}`;

  function handleSaved(row: Activity, isNew: boolean) {
    setActivities(current => isNew ? [...current, row] : current.map(item => item.id === row.id ? row : item));
    setEditing(null);
  }

  const periods = useMemo(() => {
    if (!dated.length) return [] as string[];
    const min = new Date(Math.min(...dated.map(row => +new Date(row.planned_start!))));
    const max = new Date(Math.max(...dated.map(row => +new Date(row.planned_end!))));
    const keys: string[] = [];
    let cursor = new Date(min);
    let guard = 0;
    while (cursor <= max && guard < 300) {
      const key = periodKey(cursor, granularity);
      if (!keys.includes(key)) keys.push(key);
      cursor = nextPeriod(cursor, granularity);
      guard += 1;
    }
    return keys;
  }, [dated, granularity]);

  function activityPeriods(activity: Activity): Set<string> {
    const result = new Set<string>();
    let cursor = new Date(activity.planned_start!);
    const end = new Date(activity.planned_end!);
    let guard = 0;
    while (cursor <= end && guard < 500) {
      result.add(periodKey(cursor, granularity));
      cursor = nextPeriod(cursor, granularity);
      guard += 1;
    }
    return result;
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black text-forest">{en ? "Forecast calendar (high-level view)" : "Calendrier previsionnel (vue haut niveau)"}</h2>
      <div className="flex flex-wrap items-center gap-2">
        {([["week", en ? "Week" : "Semaine"], ["month", en ? "Month" : "Mois"], ["quarter", en ? "Quarter" : "Trimestre"], ["year", en ? "Year" : "Annee"]] as const).map(([value, label]) => <button key={value} onClick={() => setGranularity(value)} className={`rounded-full px-4 py-2 text-xs font-bold ${granularity === value ? "bg-forest text-white" : "bg-slate-100 text-slate-600 hover:bg-mint"}`}>{label}</button>)}
        <button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New activity" : "Nouvelle activite"}</button>
      </div>
    </div>
    {!periods.length ? <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No dated activity to display." : "Aucune activite datee a afficher."}</p> : <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Activity" : "Activite"}</th>{periods.map(key => <th key={key} className="whitespace-nowrap p-3 text-center">{periodLabel(key, granularity, en)}</th>)}</tr></thead>
        <tbody>
          {dated.map(activity => {
            const covered = activityPeriods(activity);
            return <tr key={activity.id} className="border-t">
              <td className="whitespace-nowrap p-3 font-bold text-forest"><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{activityCode(activity)}</span>{activity.title}</td>
              {periods.map(key => <td key={key} className="p-1 text-center">{covered.has(key) && <span className="mx-auto block h-4 rounded-full bg-leaf" />}</td>)}
            </tr>;
          })}
        </tbody>
      </table>
    </div>}
    <ActivityFormModal projectId={projectId} target={editing} onClose={() => setEditing(null)} onSaved={handleSaved} workPackages={workPackages} outputs={outputs} indicators={indicators} activities={activities} knownPeople={knownPeople} />
  </div>;
}
