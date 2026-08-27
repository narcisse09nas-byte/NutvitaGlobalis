"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, Deliverable, DeliverableAcceptanceStatus, DeliverableType, ExternalApprover, PPMResource, WBSNode } from "@/lib/ppm/types";

const typeLabels: Record<DeliverableType, { fr: string; en: string }> = { report: { fr: "Rapport", en: "Report" }, product: { fr: "Produit", en: "Product" }, infrastructure: { fr: "Infrastructure", en: "Infrastructure" }, training: { fr: "Formation", en: "Training" }, service: { fr: "Service", en: "Service" }, other: { fr: "Autre", en: "Other" } };
const acceptanceLabels: Record<DeliverableAcceptanceStatus, { fr: string; en: string }> = {
  pending: { fr: "Brouillon", en: "Draft" }, submitted: { fr: "Soumis", en: "Submitted" }, quality_check: { fr: "Controle qualite", en: "Quality check" }, accepted: { fr: "Accepte", en: "Accepted" },
  rejected: { fr: "Rejete", en: "Rejected" }, returned_for_revision: { fr: "Retourne pour revision", en: "Returned for revision" },
};
const acceptanceTones: Record<DeliverableAcceptanceStatus, string> = {
  pending: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", quality_check: "bg-amber-50 text-amber-800",
  accepted: "bg-mint text-forest", rejected: "bg-red-50 text-red-700", returned_for_revision: "bg-orange/10 text-orange",
};
const nextAction: Partial<Record<DeliverableAcceptanceStatus, { next: DeliverableAcceptanceStatus; label: { fr: string; en: string } }>> = {
  pending: { next: "submitted", label: { fr: "Soumettre", en: "Submit" } },
  submitted: { next: "quality_check", label: { fr: "Envoyer en controle qualite", en: "Send to quality check" } },
  returned_for_revision: { next: "submitted", label: { fr: "Re-soumettre", en: "Resubmit" } },
};

export default function DeliverableManager({ projectId, initial, wbsNodes, activities, externalApprovers = [], staff = [] }: {
  projectId: string; initial: Deliverable[]; wbsNodes: WBSNode[]; activities: Activity[]; externalApprovers?: ExternalApprover[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Deliverable | "new" | null>(null);
  const [filePath, setFilePath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accepting, setAccepting] = useState<Deliverable | null>(null);
  const wbsLabel = (id?: string | null) => wbsNodes.find(item => item.id === id)?.title || "—";
  const activityLabel = (id?: string | null) => activities.find(item => item.id === id)?.title || "—";
  // Refinement program, Wave 8 (item 46): category is set at deliverable creation so the register
  // (and later, reporting) can filter by category first, instead of scrolling a long flat list.
  const categories = Array.from(new Set(rows.map(item => item.category).filter((value): value is string => !!value)));
  const filteredRows = categoryFilter ? rows.filter(item => item.category === categoryFilter) : rows;
  // Refinement program, Wave 2: a simple sequential code (DEL-01, DEL-02...) computed from
  // creation order — same "computed, never stored" approach as WBS/Result-Chain codes.
  const deliverableCode = (row: Deliverable) => {
    const index = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at)).findIndex(item => item.id === row.id);
    return `DEL-${String(index + 1).padStart(2, "0")}`;
  };

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

  // Refinement program, Wave 4 (item 32): a deliverable's file can be replaced/removed before
  // submission — restricted to "pending" (brouillon), same pattern as Expenses/Achievements.
  async function removeFile() {
    if (!filePath) return;
    if (!confirm(en ? "Remove this file?" : "Retirer ce fichier ?")) return;
    await createClient().storage.from("document-vault").remove([filePath]);
    setFilePath("");
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
    if (next === "accepted") { setAccepting(row); return; }
    const note = prompt(en ? "Comment (required):" : "Commentaire (obligatoire) :");
    if (!note) return;
    advance(row, next, { notes: note });
  }

  // Refinement program, Wave 8 (item 46): "accepted by" is a dropdown of external approvers
  // (created during project Cadrage — see ExternalApproverRegister), not a blind prompt().
  async function submitAcceptance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepting) return;
    const form = new FormData(event.currentTarget);
    const approver = externalApprovers.find(item => item.id === String(form.get("accepted_by_id") || ""));
    await advance(accepting, "accepted", { accepted_by_name: approver?.name || null, accepted_at: new Date().toISOString() });
    setAccepting(null);
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
      category: String(form.get("category") || "").trim() || null,
      type: String(form.get("type") || "product") as DeliverableType,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      planned_date: String(form.get("planned_date") || "") || null,
      actual_date: String(form.get("actual_date") || "") || null,
      acceptance_criteria: String(form.get("acceptance_criteria") || "").trim() || null,
      acceptance_status: acceptance,
      accepted_by_name: String(form.get("accepted_by_name") || "").trim() || null,
      accepted_at: acceptance === "accepted" ? (!isNew ? (editing as Deliverable).accepted_at : null) || new Date().toISOString() : null,
      version: Number(form.get("version") || 1),
      notes: String(form.get("notes") || "").trim() || null,
      file_path: filePath || null,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black text-forest">{en ? "Deliverables" : "Livrables"}</h2>
      <div className="flex flex-wrap items-center gap-2">
        {!!categories.length && <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="admin-input w-auto"><option value="">{en ? "All categories" : "Toutes categories"}</option>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select>}
        <button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New deliverable" : "Nouveau livrable"}</button>
      </div>
    </div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Deliverable" : "Livrable"}</th><th className="p-4">{en ? "Linked to" : "Rattachement"}</th><th className="p-4">{en ? "Responsible" : "Responsable"}</th><th className="p-4">{en ? "Deadline" : "Echeance"}</th><th className="p-4">{en ? "Version" : "Version"}</th><th className="p-4">{en ? "Acceptance" : "Acceptation"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {filteredRows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{deliverableCode(row)}</span><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{typeLabels[row.type][locale]}</p></td>
            <td className="p-4">{row.work_package_id ? wbsLabel(row.work_package_id) : row.activity_id ? activityLabel(row.activity_id) : "—"}</td>
            <td className="p-4">{row.responsible_name || "—"}</td>
            <td className="p-4">{row.planned_date ? new Date(row.planned_date).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}</td>
            <td className="p-4">v{row.version}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${acceptanceTones[row.acceptance_status]}`}>{acceptanceLabels[row.acceptance_status][locale]}</span></td>
            <td className="p-4"><div className="flex flex-wrap gap-2">
              <button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Open" : "Ouvrir"}</button>
              {nextAction[row.acceptance_status] && <button onClick={() => advance(row, nextAction[row.acceptance_status]!.next)} className="btn-primary px-3 py-2 text-xs">{nextAction[row.acceptance_status]!.label[locale]}</button>}
              {row.acceptance_status === "quality_check" && <>
                <button onClick={() => decide(row, "accepted")} className="btn-primary px-3 py-2 text-xs">{en ? "Accept" : "Accepter"}</button>
                <button onClick={() => decide(row, "returned_for_revision")} className="btn-secondary px-3 py-2 text-xs">{en ? "Return" : "Retourner"}</button>
                <button onClick={() => decide(row, "rejected")} className="btn-secondary px-3 py-2 text-xs">{en ? "Reject" : "Rejeter"}</button>
              </>}
            </div></td>
          </tr>)}
          {!filteredRows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">{en ? "No deliverable recorded." : "Aucun livrable enregistre."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New deliverable" : "Nouveau livrable") : (en ? "Edit deliverable" : "Modifier le livrable")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<input name="category" list="deliverable-category-suggestions" defaultValue={editing !== "new" ? editing.category || "" : ""} className="admin-input" />
            <datalist id="deliverable-category-suggestions">{categories.map(value => <option key={value} value={value} />)}</datalist>
          </label>
          <label className="grid gap-2 text-sm font-bold">Work Package<select name="work_package_id" defaultValue={editing !== "new" ? editing.work_package_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{wbsNodes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Activity" : "Activite"}<select name="activity_id" defaultValue={editing !== "new" ? editing.activity_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucune"}</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Type" : "Type"}<select name="type" defaultValue={editing !== "new" ? editing.type : "product"} className="admin-input">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Responsible" : "Responsable"}<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Planned date" : "Date planifiee"}<input name="planned_date" type="date" defaultValue={editing !== "new" ? editing.planned_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Actual date" : "Date reelle"}<input name="actual_date" type="date" defaultValue={editing !== "new" ? editing.actual_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Acceptance criteria" : "Criteres d'acceptation"}<textarea name="acceptance_criteria" rows={2} defaultValue={editing !== "new" ? editing.acceptance_criteria || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Acceptance" : "Acceptation"}<select name="acceptance_status" defaultValue={editing !== "new" ? editing.acceptance_status : "pending"} className="admin-input">{Object.entries(acceptanceLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Accepted by" : "Accepte par"}<input name="accepted_by_name" defaultValue={editing !== "new" ? editing.accepted_by_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Version" : "Version"}<input name="version" type="number" min="1" defaultValue={editing !== "new" ? editing.version : 1} className="admin-input" /></label>
          <div className="grid gap-2 text-sm font-bold sm:col-span-2">
            {en ? "Deliverable file" : "Fichier du livrable"}
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{uploading ? (en ? "Uploading..." : "Televersement...") : filePath ? (en ? "Replace the file" : "Remplacer le fichier") : (en ? "Choose a file" : "Choisir un fichier")}<input type="file" onChange={uploadFile} className="hidden" /></label>
              {filePath && <button type="button" onClick={() => viewFile(filePath)} className="text-sm font-bold text-leaf">{en ? "View the uploaded file" : "Voir le fichier televerse"}</button>}
              {filePath && (editing === "new" || editing.acceptance_status === "pending") && <button type="button" onClick={() => removeFile()} className="text-sm font-bold text-red-600">{en ? "Remove" : "Retirer"}</button>}
            </div>
          </div>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Notes" : "Notes"}<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {accepting && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitAcceptance} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Accept" : "Accepter"} — {accepting.title}</h2><button type="button" onClick={() => setAccepting(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          {accepting.acceptance_criteria ? <div className="rounded-xl bg-mint/30 p-3 text-sm text-forest"><b className="block text-xs font-black uppercase text-slate-400">{en ? "Acceptance criteria" : "Criteres d'acceptation"}</b>{accepting.acceptance_criteria}</div>
            : <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">{en ? "No acceptance criteria recorded for this deliverable." : "Aucun critere d'acceptation enregistre pour ce livrable."}</p>}
          <label className="grid gap-2 text-sm font-bold">
            {en ? "Accepted by" : "Accepte par"}
            <select name="accepted_by_id" required className="admin-input">
              <option value="">{externalApprovers.length ? (en ? "Select..." : "Selectionner...") : (en ? "No external approver registered" : "Aucun approbateur externe enregistre")}</option>
              {externalApprovers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAccepting(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Confirm acceptance" : "Confirmer l'acceptation"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
