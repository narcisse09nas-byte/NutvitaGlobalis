"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { Activity, Deliverable, DeliverableAcceptanceStatus, DeliverableType, WBSNode } from "@/lib/ppm/types";

const typeLabels: Record<DeliverableType, string> = { report: "Rapport", product: "Produit", infrastructure: "Infrastructure", training: "Formation", service: "Service", other: "Autre" };
const acceptanceLabels: Record<DeliverableAcceptanceStatus, string> = {
  pending: "Brouillon", submitted: "Soumis", quality_check: "Controle qualite", accepted: "Accepte",
  rejected: "Rejete", returned_for_revision: "Retourne pour revision",
};
const acceptanceTones: Record<DeliverableAcceptanceStatus, string> = {
  pending: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", quality_check: "bg-amber-50 text-amber-800",
  accepted: "bg-mint text-forest", rejected: "bg-red-50 text-red-700", returned_for_revision: "bg-orange/10 text-orange",
};
const nextAction: Partial<Record<DeliverableAcceptanceStatus, { next: DeliverableAcceptanceStatus; label: string }>> = {
  pending: { next: "submitted", label: "Soumettre" },
  submitted: { next: "quality_check", label: "Envoyer en controle qualite" },
  returned_for_revision: { next: "submitted", label: "Re-soumettre" },
};

export default function DeliverableManager({ projectId, initial, wbsNodes, activities }: {
  projectId: string; initial: Deliverable[]; wbsNodes: WBSNode[]; activities: Activity[];
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Deliverable | "new" | null>(null);
  const [filePath, setFilePath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const wbsLabel = (id?: string | null) => wbsNodes.find(item => item.id === id)?.title || "—";
  const activityLabel = (id?: string | null) => activities.find(item => item.id === id)?.title || "—";

  function openEditor(row: Deliverable | "new") {
    setFilePath(row !== "new" ? row.file_path || "" : "");
    setMessage("");
    setEditing(row);
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/${projectId}/deliverables/${crypto.randomUUID()}-${safe}`;
    const { error } = await createClient().storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    setUploading(false);
    if (error) { setMessage(error.message); return; }
    setFilePath(path);
  }

  async function viewFile(path?: string) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function advance(row: Deliverable, next: DeliverableAcceptanceStatus, extra: Record<string, unknown> = {}) {
    const supabase = createClient();
    const result = await supabase.from("ppm_deliverables").update({ acceptance_status: next, ...extra }).eq("id", row.id).select("*").single();
    if (result.error) { setMessage(result.error.message); return; }
    const updated = result.data as Deliverable;
    setRows(current => current.map(item => item.id === updated.id ? updated : item));
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Livrable — ${updated.title}`, from_status: row.acceptance_status, to_status: next });
  }

  function decide(row: Deliverable, next: DeliverableAcceptanceStatus) {
    const note = next !== "accepted" ? prompt("Commentaire (obligatoire) :") : null;
    if (next !== "accepted" && !note) return;
    advance(row, next, next === "accepted" ? { accepted_by_name: prompt("Accepte par :") || null, accepted_at: new Date().toISOString() } : { notes: note });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const isNew = editing === "new";
    const acceptance = String(form.get("acceptance_status") || "pending") as DeliverableAcceptanceStatus;
    const payload = {
      project_id: projectId,
      work_package_id: String(form.get("work_package_id") || "") || null,
      activity_id: String(form.get("activity_id") || "") || null,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      type: String(form.get("type") || "product") as DeliverableType,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      planned_date: String(form.get("planned_date") || "") || null,
      actual_date: String(form.get("actual_date") || "") || null,
      acceptance_status: acceptance,
      accepted_by_name: String(form.get("accepted_by_name") || "").trim() || null,
      accepted_at: acceptance === "accepted" ? (!isNew ? (editing as Deliverable).accepted_at : null) || new Date().toISOString() : null,
      version: Number(form.get("version") || 1),
      notes: String(form.get("notes") || "").trim() || null,
      file_path: filePath || null,
    };
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const previousAcceptance = !isNew ? (editing as Deliverable).acceptance_status : null;
    const result = isNew
      ? await supabase.from("ppm_deliverables").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_deliverables").update(payload).eq("id", (editing as Deliverable).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as Deliverable, ...current] : current.map(row => row.id === result.data.id ? result.data as Deliverable : row));
    if (previousAcceptance !== acceptance && (acceptance === "accepted" || acceptance === "rejected")) {
      await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Livrable — ${payload.title}`, from_status: previousAcceptance || undefined, to_status: acceptance });
    }
    setFilePath("");
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Livrables</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouveau livrable</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Livrable</th><th className="p-4">Rattachement</th><th className="p-4">Responsable</th><th className="p-4">Echeance</th><th className="p-4">Version</th><th className="p-4">Acceptation</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{typeLabels[row.type]}</p></td>
            <td className="p-4">{row.work_package_id ? wbsLabel(row.work_package_id) : row.activity_id ? activityLabel(row.activity_id) : "—"}</td>
            <td className="p-4">{row.responsible_name || "—"}</td>
            <td className="p-4">{row.planned_date ? new Date(row.planned_date).toLocaleDateString("fr-FR") : "—"}</td>
            <td className="p-4">v{row.version}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${acceptanceTones[row.acceptance_status]}`}>{acceptanceLabels[row.acceptance_status]}</span></td>
            <td className="p-4"><div className="flex flex-wrap gap-2">
              <button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">Ouvrir</button>
              {nextAction[row.acceptance_status] && <button onClick={() => advance(row, nextAction[row.acceptance_status]!.next)} className="btn-primary px-3 py-2 text-xs">{nextAction[row.acceptance_status]!.label}</button>}
              {row.acceptance_status === "quality_check" && <>
                <button onClick={() => decide(row, "accepted")} className="btn-primary px-3 py-2 text-xs">Accepter</button>
                <button onClick={() => decide(row, "returned_for_revision")} className="btn-secondary px-3 py-2 text-xs">Retourner</button>
                <button onClick={() => decide(row, "rejected")} className="btn-secondary px-3 py-2 text-xs">Rejeter</button>
              </>}
            </div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">Aucun livrable enregistre.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouveau livrable" : "Modifier le livrable"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Titre<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Work Package<select name="work_package_id" defaultValue={editing !== "new" ? editing.work_package_id || "" : ""} className="admin-input"><option value="">Aucun</option>{wbsNodes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Activite<select name="activity_id" defaultValue={editing !== "new" ? editing.activity_id || "" : ""} className="admin-input"><option value="">Aucune</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Type<select name="type" defaultValue={editing !== "new" ? editing.type : "product"} className="admin-input">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Responsable<input name="responsible_name" defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date planifiee<input name="planned_date" type="date" defaultValue={editing !== "new" ? editing.planned_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date reelle<input name="actual_date" type="date" defaultValue={editing !== "new" ? editing.actual_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Acceptation<select name="acceptance_status" defaultValue={editing !== "new" ? editing.acceptance_status : "pending"} className="admin-input">{Object.entries(acceptanceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Accepte par<input name="accepted_by_name" defaultValue={editing !== "new" ? editing.accepted_by_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Version<input name="version" type="number" min="1" defaultValue={editing !== "new" ? editing.version : 1} className="admin-input" /></label>
          <div className="grid gap-2 text-sm font-bold sm:col-span-2">
            Fichier du livrable
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{uploading ? "Televersement..." : "Choisir un fichier"}<input type="file" onChange={uploadFile} className="hidden" /></label>
              {filePath && <button type="button" onClick={() => viewFile(filePath)} className="text-sm font-bold text-leaf">Voir le fichier televerse</button>}
            </div>
          </div>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
