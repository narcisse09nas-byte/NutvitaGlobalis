"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { Activity, BudgetLine, ChangeRequest, PmbVersion, PmbVersionStatus, WBSNode } from "@/lib/ppm/types";

const statusLabels: Record<PmbVersionStatus, string> = { draft: "Brouillon", approved: "Approuvee", superseded: "Remplacee" };
const statusTones: Record<PmbVersionStatus, string> = {
  draft: "bg-slate-100 text-slate-600", approved: "bg-mint text-forest", superseded: "bg-slate-200 text-slate-500",
};

export default function PmbVersionManager({ projectId, workPackages, budgetLines, activities, changeRequests, initial }: {
  projectId: string; workPackages: WBSNode[]; budgetLines: BudgetLine[]; activities: Activity[]; changeRequests: ChangeRequest[]; initial: PmbVersion[];
}) {
  const [versions, setVersions] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const approvableChangeRequests = changeRequests.filter(cr => (cr.status === "approved" || cr.status === "implemented") && (cr.impact_scope || cr.impact_schedule || cr.impact_budget));

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const note = String(form.get("note") || "").trim() || null;
    const changeRequestId = String(form.get("change_request_id") || "") || null;
    const nextVersion = versions.length ? Math.max(...versions.map(item => item.version)) + 1 : 1;

    const wpBacs = workPackages.map(wp => {
      const bac = budgetLines.filter(line => line.wbs_node_id === wp.id).reduce((sum, line) => sum + Number(line.revised_budget ?? line.initial_budget ?? 0), 0);
      const wpActivities = activities.filter(activity => activity.work_package_id === wp.id && activity.planned_start && activity.planned_end);
      const plannedStart = wpActivities.length ? wpActivities.map(a => a.planned_start!).sort()[0] : null;
      const plannedEnd = wpActivities.length ? wpActivities.map(a => a.planned_end!).sort().slice(-1)[0] : null;
      return { work_package_id: wp.id, title: wp.title, bac, planned_start: plannedStart, planned_end: plannedEnd };
    });
    const totalBac = wpBacs.reduce((sum, item) => sum + item.bac, 0);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const versionResult = await supabase.from("ppm_pmb_versions").insert({
      project_id: projectId, version: nextVersion, status: "draft", bac: totalBac, note,
      change_request_id: changeRequestId, created_by: user?.id,
    }).select("*").single();
    if (versionResult.error) { setSaving(false); setMessage(versionResult.error.message); return; }
    const created = versionResult.data as PmbVersion;

    if (wpBacs.length) {
      const snapshotResult = await supabase.from("ppm_pmb_work_package_snapshots").insert(
        wpBacs.map(item => ({ pmb_version_id: created.id, ...item }))
      );
      if (snapshotResult.error) { setSaving(false); setMessage(snapshotResult.error.message); return; }
    }
    setSaving(false);
    setVersions(current => [created, ...current]);
    setCreating(false);
  }

  async function approve(version: PmbVersion) {
    const approvedByName = prompt("Approuve par :");
    if (!approvedByName) return;
    const supabase = createClient();
    await supabase.from("ppm_pmb_versions").update({ status: "superseded" }).eq("project_id", projectId).eq("status", "approved");
    const result = await supabase.from("ppm_pmb_versions").update({ status: "approved", approved_by_name: approvedByName, approved_at: new Date().toISOString() }).eq("id", version.id).select("*").single();
    if (!result.error) {
      setVersions(current => current.map(item => {
        if (item.id === version.id) return result.data as PmbVersion;
        if (item.status === "approved") return { ...item, status: "superseded" };
        return item;
      }));
    }
  }

  return <div className="grid gap-4 rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-forest">Performance Measurement Baseline (PMB)</h2><p className="text-xs text-slate-400">Scope + Calendrier + Cout — verrouilles par version. Une ancienne version n&apos;est jamais ecrasee, seulement remplacee.</p></div>
      <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle version</button>
    </div>
    <div className="grid gap-2">
      {versions.map(version => <div key={version.id} className="rounded-xl border bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <b className="text-forest">PMB v{version.version}</b>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[version.status]}`}>{statusLabels[version.status]}</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">BAC : {version.bac?.toLocaleString("fr-FR") ?? "—"}{version.note ? ` · ${version.note}` : ""}</p>
        {version.approved_by_name && <p className="mt-1 text-xs text-slate-400">Approuvee par {version.approved_by_name} le {version.approved_at ? new Date(version.approved_at).toLocaleDateString("fr-FR") : "—"}</p>}
        {version.status === "draft" && <button onClick={() => approve(version)} className="btn-primary mt-2 px-3 py-1.5 text-xs">Approuver cette version</button>}
      </div>)}
      {!versions.length && <p className="text-sm text-slate-400">Aucune version PMB. Creez la premiere pour figer le budget de reference par Work Package.</p>}
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitCreate} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Nouvelle version PMB</h2><button type="button" onClick={() => setCreating(false)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <p className="text-sm text-slate-500">Cette version fige le BAC actuel de chaque Work Package ({workPackages.length} Work Package(s)).</p>
          <label className="grid gap-2 text-sm font-bold">Change Request associe (facultatif)<select name="change_request_id" className="admin-input"><option value="">Aucun</option>{approvableChangeRequests.map(cr => <option key={cr.id} value={cr.id}>{cr.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Note<textarea name="note" rows={2} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Creer la version"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
