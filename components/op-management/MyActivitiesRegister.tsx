"use client";
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { activityStatusLabels, activityStatusTones } from "@/components/op-management/ActivityFormModal";
import AchievementReportForm from "@/components/op-management/AchievementReportForm";
import { createClient } from "@/lib/supabase/client";
import { buildWbsTree, flattenWbsTree, wbsLeafNodes, type WBSTreeNode } from "@/lib/ppm/wbs";
import type { Achievement, Activity, Indicator, ResultChainNode, WBSNode } from "@/lib/ppm/types";

export default function MyActivitiesRegister({ projectId, activities, wbsNodes, outputs, indicators }: {
  projectId: string; activities: Activity[]; wbsNodes: WBSNode[]; outputs: ResultChainNode[]; indicators: Indicator[];
}) {
  const wbsCodeByid = useMemo(() => {
    const flat = flattenWbsTree(buildWbsTree(wbsNodes));
    return new Map(flat.map(node => [node.id, node] as [string, WBSTreeNode]));
  }, [wbsNodes]);
  const outputById = useMemo(() => new Map(outputs.map(item => [item.id, item])), [outputs]);
  const indicatorById = useMemo(() => new Map(indicators.map(item => [item.id, item])), [indicators]);

  const [workPackageFilter, setWorkPackageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [lateOnly, setLateOnly] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  function isLate(activity: Activity) {
    return !!activity.planned_end && activity.planned_end < today && activity.status !== "completed" && activity.status !== "cancelled";
  }

  const filtered = activities.filter(activity => {
    if (workPackageFilter && activity.work_package_id !== workPackageFilter) return false;
    if (statusFilter && activity.status !== statusFilter) return false;
    if (locationFilter && !(activity.location || "").toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (lateOnly && !isLate(activity)) return false;
    return true;
  });

  const [reporting, setReporting] = useState<Activity | null>(null);
  const [reportingHistory, setReportingHistory] = useState<Achievement[]>([]);
  const [historyFor, setHistoryFor] = useState<Activity | null>(null);
  const [history, setHistory] = useState<Achievement[]>([]);
  const [signalingFor, setSignalingFor] = useState<Activity | null>(null);
  const [signalMessage, setSignalMessage] = useState("");

  async function fetchActivityAchievements(activityId: string) {
    const { data } = await createClient().from("ppm_achievements").select("*").eq("activity_id", activityId).order("created_at", { ascending: false });
    return (data || []) as Achievement[];
  }

  async function openReport(activity: Activity) {
    const existing = await fetchActivityAchievements(activity.id);
    setReportingHistory(existing);
    setReporting(activity);
  }

  async function openHistory(activity: Activity) {
    const rows = await fetchActivityAchievements(activity.id);
    setHistory(rows);
    setHistoryFor(activity);
  }

  async function submitSignal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signalingFor) return;
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_issues").insert({
      project_id: projectId, work_package_id: signalingFor.work_package_id, activity_id: signalingFor.id,
      title: `${signalingFor.title} — ${String(form.get("title") || "Probleme signale")}`,
      description: String(form.get("description") || "").trim() || null,
      priority: String(form.get("priority") || "medium"), status: "open", created_by: user?.id,
    });
    if (!result.error) { setSignalingFor(null); setSignalMessage(""); } else setSignalMessage(result.error.message);
  }

  return <div className="grid gap-4">
    <div><h2 className="text-xl font-black text-forest">Mes activites</h2><p className="text-sm text-slate-500">{filtered.length} activite(s) qui vous sont assignees</p></div>

    <div className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4">
      <select value={workPackageFilter} onChange={event => setWorkPackageFilter(event.target.value)} className="admin-input w-auto"><option value="">Tous les Work Packages</option>{wbsLeafNodes(wbsNodes).map(node => <option key={node.id} value={node.id}>{wbsCodeByid.get(node.id)?.code} — {node.title}</option>)}</select>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="admin-input w-auto"><option value="">Tous les statuts</option>{Object.entries(activityStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input placeholder="Localisation" value={locationFilter} onChange={event => setLocationFilter(event.target.value)} className="admin-input w-auto" />
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={lateOnly} onChange={event => setLateOnly(event.target.checked)} className="h-4 w-4" />En retard uniquement</label>
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Code</th><th className="p-4">Activite</th><th className="p-4">Work Package</th><th className="p-4">Output</th><th className="p-4">Echeance</th><th className="p-4">Progression</th><th className="p-4">Budget/Depense</th><th className="p-4">Statut</th><th className="p-4">Actions</th></tr></thead>
        <tbody>
          {filtered.map(activity => { const late = isLate(activity); const wp = activity.work_package_id ? wbsCodeByid.get(activity.work_package_id) : undefined; return <tr key={activity.id} className="border-t align-top">
            <td className="p-4 font-mono text-xs text-slate-400">{wp?.code || "—"}</td>
            <td className="p-4"><b className="text-forest">{activity.title}</b>{late && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">EN RETARD</span>}</td>
            <td className="p-4">{wp?.title || "—"}</td>
            <td className="p-4">{activity.output_id ? outputById.get(activity.output_id)?.title || "—" : "—"}</td>
            <td className="p-4">{activity.planned_end ? new Date(activity.planned_end).toLocaleDateString("fr-FR") : "—"}</td>
            <td className="p-4">{activity.progress_percent != null ? `${activity.progress_percent}%` : "—"}</td>
            <td className="p-4">{activity.planned_budget ? activity.planned_budget.toLocaleString("fr-FR") : "—"} / {activity.actual_expense ? activity.actual_expense.toLocaleString("fr-FR") : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${activityStatusTones[activity.status]}`}>{activityStatusLabels[activity.status]}</span></td>
            <td className="p-4"><div className="flex flex-wrap gap-2">
              <Link href={`/op-management/projets/${projectId}/activites/${activity.id}`} className="btn-secondary px-3 py-1.5 text-xs">Voir</Link>
              <button onClick={() => openReport(activity)} className="btn-primary px-3 py-1.5 text-xs">Rapporter</button>
              <button onClick={() => setSignalingFor(activity)} className="btn-secondary px-3 py-1.5 text-xs">Signaler</button>
              <button onClick={() => openHistory(activity)} className="btn-secondary px-3 py-1.5 text-xs">Historique</button>
            </div></td>
          </tr>; })}
          {!filtered.length && <tr><td colSpan={9} className="p-10 text-center text-slate-400">Aucune activite assignee ne correspond a ces filtres.</td></tr>}
        </tbody>
      </table>
    </div>

    {reporting && <AchievementReportForm
      projectId={projectId} activity={reporting}
      workPackage={reporting.work_package_id ? wbsCodeByid.get(reporting.work_package_id) : undefined}
      output={reporting.output_id ? outputById.get(reporting.output_id) : undefined}
      indicator={reporting.indicator_id ? indicatorById.get(reporting.indicator_id) : undefined}
      previousAchievements={reportingHistory} editing="new" initialEvidence={[]}
      onClose={() => setReporting(null)}
      onSaved={row => { if (row.status !== "draft") setReporting(null); }}
    />}

    {historyFor && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <div className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Historique — {historyFor.title}</h2><button onClick={() => setHistoryFor(null)} className="text-2xl">×</button></div>
        <div className="mt-4 grid gap-2">
          {history.map(item => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b className="text-forest">{item.title}</b> <span className="text-xs text-slate-400">{item.period_label} · {item.status}</span></div>)}
          {!history.length && <p className="text-center text-sm text-slate-400">Aucune realisation rapportee pour cette activite.</p>}
        </div>
      </div>
    </div>}

    {signalingFor && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitSignal} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Signaler un probleme — {signalingFor.title}</h2><button type="button" onClick={() => setSignalingFor(null)} className="text-2xl">×</button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Titre<input name="title" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={3} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Priorite<select name="priority" defaultValue="medium" className="admin-input"><option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option><option value="critical">Critique</option></select></label>
          {signalMessage && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{signalMessage}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setSignalingFor(null)} className="btn-secondary">Annuler</button><button className="btn-primary">Signaler</button></div>
        </div>
      </form>
    </div>}

    <p className="text-xs text-slate-400">Cette liste utilise l&apos;email de responsabilite saisi via la liste deroulante du PDM. Retrouvez le detail complet du PDM sur l&apos;onglet <Link href={`/op-management/projets/${projectId}/planification/pdm`} className="font-bold text-leaf">Planification</Link>.</p>
  </div>;
}
