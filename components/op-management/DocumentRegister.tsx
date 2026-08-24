"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Deliverable, DocumentCategory, DocumentConfidentiality, DocumentStatus, PPMDocument, PPMResource, WBSNode } from "@/lib/ppm/types";

const categoryLabels: Record<DocumentCategory, { fr: string; en: string }> = {
  contract: { fr: "Contrat", en: "Contract" }, report: { fr: "Rapport", en: "Report" }, technical: { fr: "Technique", en: "Technical" }, administrative: { fr: "Administratif", en: "Administrative" },
  communication: { fr: "Communication", en: "Communication" }, financial: { fr: "Financier", en: "Financial" }, other: { fr: "Autre", en: "Other" },
};
const confidentialityLabels: Record<DocumentConfidentiality, { fr: string; en: string }> = { public: { fr: "Public", en: "Public" }, internal: { fr: "Interne", en: "Internal" }, confidential: { fr: "Confidentiel", en: "Confidential" } };
const statusLabels: Record<DocumentStatus, { fr: string; en: string }> = { draft: { fr: "Brouillon", en: "Draft" }, final: { fr: "Final", en: "Final" }, archived: { fr: "Archive", en: "Archived" } };

export default function DocumentRegister({ projectId, initial, deliverables, wbsNodes = [], staff = [] }: {
  projectId: string; initial: PPMDocument[]; deliverables: Deliverable[]; wbsNodes?: WBSNode[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<PPMDocument | "new" | null>(null);
  const [filePath, setFilePath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  // Refinement program, Wave 8 (item 47): "livrable associe" is multi-select, filtered to
  // deliverables sharing the document's own Work Package.
  const [workPackageId, setWorkPackageId] = useState("");
  const deliverableLabel = (id?: string | null) => deliverables.find(item => item.id === id)?.title;
  const deliverableLabels = (ids?: string[]) => (ids || []).map(id => deliverableLabel(id) || "—").join(", ");
  const filteredDeliverables = workPackageId ? deliverables.filter(item => item.work_package_id === workPackageId) : deliverables;

  function openEditor(row: PPMDocument | "new") {
    setFilePath(row !== "new" ? row.file_path || "" : "");
    setWorkPackageId(row !== "new" ? row.work_package_id || "" : "");
    setMessage("");
    setEditing(row);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/${projectId}/documents/${crypto.randomUUID()}-${safe}`;
    const { error } = await createClient().storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    setUploading(false);
    if (error) { setMessage(error.message); return; }
    setFilePath(path);
  }

  async function view(path?: string) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (error) { setMessage(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const deliverableIds = form.getAll("deliverable_ids").map(String).filter(Boolean);
    const payload = {
      project_id: projectId,
      work_package_id: workPackageId || null,
      deliverable_ids: deliverableIds,
      title: String(form.get("title") || "").trim(),
      category: String(form.get("category") || "other") as DocumentCategory,
      description: String(form.get("description") || "").trim() || null,
      version: Number(form.get("version") || 1),
      file_path: filePath || null,
      confidentiality: String(form.get("confidentiality") || "internal") as DocumentConfidentiality,
      status: String(form.get("status") || "draft") as DocumentStatus,
      uploaded_by_name: String(form.get("uploaded_by_name") || "").trim() || null,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_documents").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_documents").update(payload).eq("id", (editing as PPMDocument).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as PPMDocument, ...current] : current.map(row => row.id === result.data.id ? result.data as PPMDocument : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Documents" : "Documents"}</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New document" : "Nouveau document"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Document" : "Document"}</th><th className="p-4">{en ? "Category" : "Categorie"}</th><th className="p-4">{en ? "Confidentiality" : "Confidentialite"}</th><th className="p-4">{en ? "Version" : "Version"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.title}</b>{!!row.deliverable_ids?.length && <p className="mt-1 text-xs text-slate-400">{en ? "Deliverables" : "Livrables"} : {deliverableLabels(row.deliverable_ids)}</p>}</td>
            <td className="p-4">{categoryLabels[row.category][locale]}</td>
            <td className="p-4">{confidentialityLabels[row.confidentiality][locale]}</td>
            <td className="p-4">v{row.version}</td>
            <td className="p-4">{statusLabels[row.status][locale]}</td>
            <td className="p-4"><div className="flex flex-wrap gap-2">{row.file_path && <button onClick={() => view(row.file_path)} className="btn-secondary px-3 py-2 text-xs">{en ? "View" : "Voir"}</button>}<button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">{en ? "No document recorded." : "Aucun document enregistre."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New document" : "Nouveau document") : (en ? "Edit document" : "Modifier le document")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Work Package<select value={workPackageId} onChange={event => setWorkPackageId(event.target.value)} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{wbsNodes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <div className="grid gap-2 text-sm font-bold sm:col-span-2">
            {en ? "Associated deliverables (multi-select, filtered by Work Package)" : "Livrables associes (selection multiple, filtree par Work Package)"}
            <div className="max-h-40 overflow-y-auto rounded-xl border p-2">
              {filteredDeliverables.map(item => <label key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-normal hover:bg-mint/40"><input type="checkbox" name="deliverable_ids" value={item.id} defaultChecked={editing !== "new" ? (editing.deliverable_ids || []).includes(item.id) : false} className="h-4 w-4" />{item.title}</label>)}
              {!filteredDeliverables.length && <p className="p-2 text-sm text-slate-400">{en ? `No deliverable ${workPackageId ? "for this Work Package" : "recorded"}.` : `Aucun livrable ${workPackageId ? "pour ce Work Package" : "enregistre"}.`}</p>}
            </div>
          </div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="category" defaultValue={editing !== "new" ? editing.category : "other"} className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Confidentiality" : "Confidentialite"}<select name="confidentiality" defaultValue={editing !== "new" ? editing.confidentiality : "internal"} className="admin-input">{Object.entries(confidentialityLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "draft"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Version" : "Version"}<input name="version" type="number" min="1" defaultValue={editing !== "new" ? editing.version : 1} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Uploaded by" : "Televerse par"}<SearchableSelect name="uploaded_by_name" options={staffOptions} defaultValue={editing !== "new" ? editing.uploaded_by_name || "" : ""} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <div className="grid gap-2 text-sm font-bold sm:col-span-2">
            {en ? "File" : "Fichier"}
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-secondary cursor-pointer px-4 py-2 text-sm">{uploading ? (en ? "Uploading..." : "Televersement...") : (en ? "Choose a file" : "Choisir un fichier")}<input type="file" onChange={upload} className="hidden" /></label>
              {filePath && <button type="button" onClick={() => view(filePath)} className="text-sm font-bold text-leaf">{en ? "Open the uploaded file" : "Ouvrir le fichier televerse"}</button>}
            </div>
          </div>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
