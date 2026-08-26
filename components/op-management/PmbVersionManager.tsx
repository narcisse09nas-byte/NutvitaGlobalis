"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, BudgetLine, ChangeRequest, PmbVersion, PmbVersionStatus, PPMResource, WBSNode } from "@/lib/ppm/types";

const statusLabels: Record<PmbVersionStatus, { fr: string; en: string }> = { draft: { fr: "Brouillon", en: "Draft" }, approved: { fr: "Approuvee", en: "Approved" }, superseded: { fr: "Remplacee", en: "Superseded" } };
const statusTones: Record<PmbVersionStatus, string> = {
  draft: "bg-slate-100 text-slate-600", approved: "bg-mint text-forest", superseded: "bg-slate-200 text-slate-500",
};

export default function PmbVersionManager({ projectId, workPackages, budgetLines, activities, changeRequests, initial, staff = [] }: {
  projectId: string; workPackages: WBSNode[]; budgetLines: BudgetLine[]; activities: Activity[]; changeRequests: ChangeRequest[]; initial: PmbVersion[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [versions, setVersions] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [approving, setApproving] = useState<PmbVersion | null>(null);
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

  async function submitApproval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!approving) return;
    const form = new FormData(event.currentTarget);
    const approvedByName = String(form.get("approved_by_name") || "").trim();
    if (!approvedByName) return;
    const supabase = createClient();
    await supabase.from("ppm_pmb_versions").update({ status: "superseded" }).eq("project_id", projectId).eq("status", "approved");
    const result = await supabase.from("ppm_pmb_versions").update({ status: "approved", approved_by_name: approvedByName, approved_at: new Date().toISOString() }).eq("id", approving.id).select("*").single();
    if (!result.error) {
      setVersions(current => current.map(item => {
        if (item.id === approving.id) return result.data as PmbVersion;
        if (item.status === "approved") return { ...item, status: "superseded" };
        return item;
      }));
    }
    setApproving(null);
  }

  return <div className="grid gap-4 rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-forest">Performance Measurement Baseline (PMB)</h2><p className="text-xs text-slate-400">{en ? "Scope + Schedule + Cost — locked per version. An old version is never overwritten, only superseded." : "Scope + Calendrier + Cout — verrouilles par version. Une ancienne version n'est jamais ecrasee, seulement remplacee."}</p></div>
      <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New version" : "Nouvelle version"}</button>
    </div>
    <div className="grid gap-2">
      {versions.map(version => <div key={version.id} className="rounded-xl border bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <b className="text-forest">PMB v{version.version}</b>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[version.status]}`}>{statusLabels[version.status][locale]}</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">BAC : {version.bac?.toLocaleString(en ? "en-US" : "fr-FR") ?? "—"}{version.note ? ` · ${version.note}` : ""}</p>
        {version.approved_by_name && <p className="mt-1 text-xs text-slate-400">{en ? "Approved by" : "Approuvee par"} {version.approved_by_name} {en ? "on" : "le"} {version.approved_at ? new Date(version.approved_at).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}</p>}
        {version.status === "draft" && <button onClick={() => setApproving(version)} className="btn-primary mt-2 px-3 py-1.5 text-xs">{en ? "Approve this version" : "Approuver cette version"}</button>}
      </div>)}
      {!versions.length && <p className="text-sm text-slate-400">{en ? "No PMB version. Create the first one to lock the reference budget by Work Package." : "Aucune version PMB. Creez la premiere pour figer le budget de reference par Work Package."}</p>}
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submitCreate} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New PMB version" : "Nouvelle version PMB"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <p className="text-sm text-slate-500">{en ? `This version locks the current BAC of each Work Package (${workPackages.length} Work Package(s)).` : `Cette version fige le BAC actuel de chaque Work Package (${workPackages.length} Work Package(s)).`}</p>
          <label className="grid gap-2 text-sm font-bold">{en ? "Associated Change Request (optional)" : "Change Request associe (facultatif)"}<select name="change_request_id" className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{approvableChangeRequests.map(cr => <option key={cr.id} value={cr.id}>{cr.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Note" : "Note"}<textarea name="note" rows={2} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Create the version" : "Creer la version")}</button></div>
        </div>
      </form>
    </div>}

    {approving && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submitApproval} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Approve" : "Approuver"} — PMB v{approving.version}</h2><button type="button" onClick={() => setApproving(null)} className="text-2xl">×</button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Approved by" : "Approuve par"}<SearchableSelect name="approved_by_name" options={staffOptions} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setApproving(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Confirm" : "Confirmer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
