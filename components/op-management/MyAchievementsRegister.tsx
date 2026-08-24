"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import AchievementReportForm from "@/components/op-management/AchievementReportForm";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { wbsLeafNodes } from "@/lib/ppm/wbs";
import type { Achievement, AchievementEvidence, AchievementStatus, Activity, Indicator, ResultChainNode, WBSNode } from "@/lib/ppm/types";

const statusLabels: Record<AchievementStatus, string> = {
  draft: "Brouillon", submitted: "Soumise", under_review: "En cours de revue", validated: "Validee",
  returned: "Retournee pour correction", rejected: "Rejetee", cancelled: "Annulee",
};
const statusTones: Record<AchievementStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", under_review: "bg-amber-50 text-amber-800",
  validated: "bg-mint text-forest", returned: "bg-orange/10 text-orange", rejected: "bg-red-50 text-red-700", cancelled: "bg-slate-200 text-slate-500",
};

export default function MyAchievementsRegister({ projectId, initial, activities, wbsNodes, outputs, indicators }: {
  projectId: string; initial: Achievement[]; activities: Activity[]; wbsNodes: WBSNode[]; outputs: ResultChainNode[]; indicators: Indicator[];
}) {
  const [rows, setRows] = useState(initial);
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [editingHistory, setEditingHistory] = useState<Achievement[]>([]);
  const [editingEvidence, setEditingEvidence] = useState<AchievementEvidence[]>([]);
  const [picking, setPicking] = useState(false);
  const [wpFilter, setWpFilter] = useState("");
  const [creatingActivity, setCreatingActivity] = useState<Activity | null>(null);
  const [creatingHistory, setCreatingHistory] = useState<Achievement[]>([]);

  const activityById = new Map(activities.map(item => [item.id, item]));
  const wbsById = new Map(wbsNodes.map(item => [item.id, item]));
  const outputById = new Map(outputs.map(item => [item.id, item]));
  const indicatorById = new Map(indicators.map(item => [item.id, item]));

  const filtered = statusFilter ? rows.filter(row => row.status === statusFilter) : rows;
  const pickableActivities = wpFilter ? activities.filter(item => item.work_package_id === wpFilter) : activities;

  async function fetchActivityAchievements(activityId: string) {
    const { data } = await createClient().from("ppm_achievements").select("*").eq("activity_id", activityId).order("created_at", { ascending: false });
    return (data || []) as Achievement[];
  }

  async function openEdit(row: Achievement) {
    const supabase = createClient();
    const [{ data: history }, { data: evidenceRows }] = await Promise.all([
      supabase.from("ppm_achievements").select("*").eq("activity_id", row.activity_id).neq("id", row.id).order("created_at", { ascending: false }),
      supabase.from("ppm_achievement_evidence").select("*").eq("achievement_id", row.id).order("created_at", { ascending: false }),
    ]);
    setEditingHistory((history || []) as Achievement[]);
    setEditingEvidence((evidenceRows || []) as AchievementEvidence[]);
    setEditing(row);
  }

  async function cancelDraft(row: Achievement) {
    if (!confirm("Annuler ce brouillon ?")) return;
    const result = await createClient().from("ppm_achievements").update({ status: "cancelled" }).eq("id", row.id).select("*").single();
    if (!result.error) setRows(current => current.map(item => item.id === row.id ? result.data as Achievement : item));
  }

  function handleSaved(row: Achievement) {
    setRows(current => current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [row, ...current]);
    if (row.status !== "draft") setEditing(null);
  }

  async function confirmPick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const activityId = String(form.get("activity_id") || "");
    const activity = activityById.get(activityId);
    if (!activity) return;
    const history = await fetchActivityAchievements(activityId);
    setCreatingHistory(history);
    setCreatingActivity(activity);
    setPicking(false);
  }

  function handleCreated(row: Achievement) {
    setRows(current => current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [row, ...current]);
    if (row.status !== "draft") setCreatingActivity(null);
  }

  const editingActivity = editing ? activityById.get(editing.activity_id) : undefined;

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-forest">Mes realisations</h2><p className="text-sm text-slate-500">{filtered.length} realisation(s)</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="admin-input w-auto"><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button onClick={() => { setWpFilter(""); setPicking(true); }} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle realisation</button>
      </div>
    </div>
    <div className="grid gap-3">
      {filtered.map(row => { const activity = activityById.get(row.activity_id); return <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{activity?.title}{row.period_label ? ` · ${row.period_label}` : ""}{row.progress_percent != null ? ` · ${row.progress_percent}%` : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        {row.description && <p className="mt-2 text-sm text-slate-600">{row.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {row.status === "draft" && <button onClick={() => openEdit(row)} className="btn-primary px-3 py-1.5 text-xs">Reprendre / Soumettre</button>}
          {row.status !== "draft" && <button onClick={() => openEdit(row)} className="btn-secondary px-3 py-1.5 text-xs">Voir</button>}
          {row.status === "draft" && <button onClick={() => cancelDraft(row)} className="btn-secondary px-3 py-1.5 text-xs">Annuler</button>}
        </div>
      </article>; })}
      {!filtered.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune realisation.</p>}
    </div>

    {editing && editingActivity && <AchievementReportForm
      projectId={projectId} activity={editingActivity}
      workPackage={editingActivity.work_package_id ? wbsById.get(editingActivity.work_package_id) : undefined}
      output={editingActivity.output_id ? outputById.get(editingActivity.output_id) : undefined}
      indicator={editingActivity.indicator_id ? indicatorById.get(editingActivity.indicator_id) : undefined}
      previousAchievements={editingHistory} editing={editing} initialEvidence={editingEvidence}
      onClose={() => setEditing(null)}
      onSaved={handleSaved}
    />}

    {picking && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={confirmPick} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Nouvelle realisation</h2><button type="button" onClick={() => setPicking(false)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <p className="mt-2 text-sm text-slate-500">Choisissez d&apos;abord le Work Package puis l&apos;activite a rapporter — les champs connus (output, indicateur, cible) seront pre-remplis automatiquement.</p>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Work Package (facultatif, pour filtrer)
            <select value={wpFilter} onChange={event => setWpFilter(event.target.value)} className="admin-input"><option value="">Tous</option>{wbsLeafNodes(wbsNodes).map(node => <option key={node.id} value={node.id}>{node.title}</option>)}</select>
          </label>
          <label className="grid gap-2 text-sm font-bold">Activite
            <SearchableSelect name="activity_id" required options={pickableActivities.map(item => ({ value: item.id, label: item.title, hint: item.work_package_id ? wbsById.get(item.work_package_id)?.title : undefined }))} placeholder="Selectionner une activite..." />
          </label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setPicking(false)} className="btn-secondary">Annuler</button><button className="btn-primary">Continuer</button></div>
        </div>
      </form>
    </div>}

    {creatingActivity && <AchievementReportForm
      projectId={projectId} activity={creatingActivity}
      workPackage={creatingActivity.work_package_id ? wbsById.get(creatingActivity.work_package_id) : undefined}
      output={creatingActivity.output_id ? outputById.get(creatingActivity.output_id) : undefined}
      indicator={creatingActivity.indicator_id ? indicatorById.get(creatingActivity.indicator_id) : undefined}
      previousAchievements={creatingHistory} editing="new" initialEvidence={[]}
      onClose={() => setCreatingActivity(null)}
      onSaved={handleCreated}
    />}
  </div>;
}
