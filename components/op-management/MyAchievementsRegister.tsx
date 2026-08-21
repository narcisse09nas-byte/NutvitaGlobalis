"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AchievementReportForm from "@/components/op-management/AchievementReportForm";
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

  const activityById = new Map(activities.map(item => [item.id, item]));
  const wbsById = new Map(wbsNodes.map(item => [item.id, item]));
  const outputById = new Map(outputs.map(item => [item.id, item]));
  const indicatorById = new Map(indicators.map(item => [item.id, item]));

  const filtered = statusFilter ? rows.filter(row => row.status === statusFilter) : rows;

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

  const editingActivity = editing ? activityById.get(editing.activity_id) : undefined;

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-forest">Mes realisations</h2><p className="text-sm text-slate-500">{filtered.length} realisation(s)</p></div>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="admin-input w-auto"><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
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
  </div>;
}
