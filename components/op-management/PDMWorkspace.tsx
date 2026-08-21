"use client";
import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";
import ActivityFormModal, { activityStatusLabels, activityStatusTones, type ActivityEditTarget } from "@/components/op-management/ActivityFormModal";
import type { Activity, Indicator, KnownPerson, ResultChainNode, WBSNode } from "@/lib/ppm/types";

type View = "table" | "gantt" | "calendar" | "kanban";
const KANBAN_COLUMNS: Activity["status"][] = ["not_started", "in_progress", "delayed", "blocked", "completed"];

export default function PDMWorkspace({ projectId, initial, workPackages, outputs, indicators, knownPeople }: {
  projectId: string; initial: Activity[]; workPackages: WBSNode[]; outputs: ResultChainNode[]; indicators: Indicator[]; knownPeople: KnownPerson[];
}) {
  const [activities, setActivities] = useState(initial);
  const [view, setView] = useState<View>("table");
  const [editing, setEditing] = useState<ActivityEditTarget>(null);

  function handleSaved(row: Activity, isNew: boolean) {
    setActivities(current => isNew ? [...current, row] : current.map(item => item.id === row.id ? row : item));
    setEditing(null);
  }

  const outputTitle = (id?: string | null) => outputs.find(item => item.id === id)?.title || "—";

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-forest">PDM — Plan detaille de mise en oeuvre</h2><p className="text-sm text-slate-500">{activities.length} activite(s)</p></div>
      <button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle activite</button>
    </div>

    <div className="flex flex-wrap gap-2">
      {([["table", "Tableau"], ["gantt", "Gantt"], ["calendar", "Calendrier"], ["kanban", "Kanban"]] as const).map(([value, label]) => <button key={value} onClick={() => setView(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${view === value ? "bg-forest text-white" : "bg-slate-100 text-slate-600 hover:bg-mint"}`}>{label}</button>)}
    </div>

    {view === "table" && <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Activite</th><th className="p-4">Output</th><th className="p-4">Responsable</th><th className="p-4">Periode</th><th className="p-4">Progression</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {activities.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.title}</b>{row.is_milestone && <span className="ml-2 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-black text-orange">JALON</span>}</td>
            <td className="p-4">{outputTitle(row.output_id)}</td>
            <td className="p-4">{row.responsible_name || "—"}</td>
            <td className="p-4">{row.planned_start ? new Date(row.planned_start).toLocaleDateString("fr-FR") : "—"} → {row.planned_end ? new Date(row.planned_end).toLocaleDateString("fr-FR") : "—"}</td>
            <td className="p-4">{row.progress_percent != null ? `${row.progress_percent}%` : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${activityStatusTones[row.status]}`}>{activityStatusLabels[row.status]}</span></td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><Link href={`/op-management/projets/${projectId}/activites/${row.id}`} className="btn-secondary px-3 py-2 text-xs">Voir 360°</Link><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></div></td>
          </tr>)}
          {!activities.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">Aucune activite enregistree.</td></tr>}
        </tbody>
      </table>
    </div>}

    {view === "gantt" && <GanttView activities={activities} onEdit={setEditing} />}
    {view === "calendar" && <CalendarView activities={activities} onEdit={setEditing} />}
    {view === "kanban" && <KanbanView activities={activities} onEdit={setEditing} />}

    <ActivityFormModal projectId={projectId} target={editing} onClose={() => setEditing(null)} onSaved={handleSaved} workPackages={workPackages} outputs={outputs} indicators={indicators} activities={activities} knownPeople={knownPeople} />
  </div>;
}

function GanttView({ activities, onEdit }: { activities: Activity[]; onEdit: (row: Activity) => void }) {
  const dated = activities.filter(row => row.planned_start && row.planned_end);
  if (!dated.length) return <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune activite datee a afficher en Gantt.</p>;
  const starts = dated.map(row => +new Date(row.planned_start!));
  const ends = dated.map(row => +new Date(row.planned_end!));
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = Math.max(max - min, 86400000);
  return <div className="grid gap-2 rounded-2xl border bg-white p-5">
    {dated.map(row => {
      const left = ((+new Date(row.planned_start!) - min) / span) * 100;
      const width = Math.max((((+new Date(row.planned_end!)) - (+new Date(row.planned_start!))) / span) * 100, 1.5);
      return <button key={row.id} onClick={() => onEdit(row)} className="grid grid-cols-[180px_1fr] items-center gap-3 text-left">
        <span className="truncate text-sm font-bold text-forest">{row.title}</span>
        <span className="relative h-6 rounded-full bg-slate-100"><span className={`absolute h-6 rounded-full ${activityStatusTones[row.status].split(" ")[0]}`} style={{ left: `${left}%`, width: `${width}%` }} /></span>
      </button>;
    })}
  </div>;
}

function CalendarView({ activities, onEdit }: { activities: Activity[]; onEdit: (row: Activity) => void }) {
  const groups = new Map<string, Activity[]>();
  for (const row of activities) {
    if (!row.planned_start) continue;
    const key = new Date(row.planned_start).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  const entries = [...groups.entries()].sort((a, b) => +new Date(a[1][0].planned_start!) - +new Date(b[1][0].planned_start!));
  if (!entries.length) return <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune activite datee a afficher au calendrier.</p>;
  return <div className="grid gap-5">
    {entries.map(([month, rows]) => <div key={month} className="rounded-2xl border bg-white p-5">
      <h3 className="mb-3 font-black capitalize text-forest">{month}</h3>
      <div className="grid gap-2">
        {rows.sort((a, b) => +new Date(a.planned_start!) - +new Date(b.planned_start!)).map(row => <button key={row.id} onClick={() => onEdit(row)} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-left hover:bg-mint">
          <span><b className="text-sm text-forest">{new Date(row.planned_start!).toLocaleDateString("fr-FR", { day: "2-digit" })}</b> <span className="text-sm">{row.title}</span></span>
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${activityStatusTones[row.status]}`}>{activityStatusLabels[row.status]}</span>
        </button>)}
      </div>
    </div>)}
  </div>;
}

function KanbanView({ activities, onEdit }: { activities: Activity[]; onEdit: (row: Activity) => void }) {
  return <div className="grid gap-4 lg:grid-cols-5">
    {KANBAN_COLUMNS.map(status => <div key={status} className="rounded-2xl border bg-white p-4">
      <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">{activityStatusLabels[status]} ({activities.filter(row => row.status === status).length})</p>
      <div className="grid gap-2">
        {activities.filter(row => row.status === status).map(row => <button key={row.id} onClick={() => onEdit(row)} className="rounded-xl bg-slate-50 p-3 text-left hover:bg-mint">
          <b className="block text-sm text-forest">{row.title}</b>
          {row.responsible_name && <span className="mt-1 block text-xs text-slate-400">{row.responsible_name}</span>}
        </button>)}
        {!activities.filter(row => row.status === status).length && <p className="text-xs text-slate-300">Vide</p>}
      </div>
    </div>)}
  </div>;
}
