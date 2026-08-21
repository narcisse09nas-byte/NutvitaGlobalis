"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { Deliverable, DocumentCategory, DocumentConfidentiality, DocumentStatus, PPMDocument } from "@/lib/ppm/types";

const categoryLabels: Record<DocumentCategory, string> = {
  contract: "Contrat", report: "Rapport", technical: "Technique", administrative: "Administratif",
  communication: "Communication", financial: "Financier", other: "Autre",
};
const confidentialityLabels: Record<DocumentConfidentiality, string> = { public: "Public", internal: "Interne", confidential: "Confidentiel" };
const statusLabels: Record<DocumentStatus, string> = { draft: "Brouillon", final: "Final", archived: "Archive" };

export default function DocumentRegister({ projectId, initial, deliverables }: { projectId: string; initial: PPMDocument[]; deliverables: Deliverable[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<PPMDocument | "new" | null>(null);
  const [filePath, setFilePath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const deliverableLabel = (id?: string | null) => deliverables.find(item => item.id === id)?.title;

  function openEditor(row: PPMDocument | "new") {
    setFilePath(row !== "new" ? row.file_path || "" : "");
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
    const payload = {
      project_id: projectId,
      deliverable_id: String(form.get("deliverable_id") || "") || null,
      title: String(form.get("title") || "").trim(),
      category: String(form.get("category") || "other") as DocumentCategory,
      description: String(form.get("description") || "").trim() || null,
      version: Number(form.get("version") || 1),
      file_path: filePath || null,
      confidentiality: String(form.get("confidentiality") || "internal") as DocumentConfidentiality,
      status: String(form.get("status") || "draft") as DocumentStatus,
      uploaded_by_name: String(form.get("uploaded_by_name") || "").trim() || null,
    };
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
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
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Documents</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouveau document</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Document</th><th className="p-4">Categorie</th><th className="p-4">Confidentialite</th><th className="p-4">Version</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.title}</b>{row.deliverable_id && <p className="mt-1 text-xs text-slate-400">Livrable : {deliverableLabel(row.deliverable_id) || "—"}</p>}</td>
            <td className="p-4">{categoryLabels[row.category]}</td>
            <td className="p-4">{confidentialityLabels[row.confidentiality]}</td>
            <td className="p-4">v{row.version}</td>
            <td className="p-4">{statusLabels[row.status]}</td>
            <td className="p-4"><div className="flex flex-wrap gap-2">{row.file_path && <button onClick={() => view(row.file_path)} className="btn-secondary px-3 py-2 text-xs">Voir</button>}<button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucun document enregistre.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouveau document" : "Modifier le document"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Titre<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Livrable associe<select name="deliverable_id" defaultValue={editing !== "new" ? editing.deliverable_id || "" : ""} className="admin-input"><option value="">Aucun</option>{deliverables.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Categorie<select name="category" defaultValue={editing !== "new" ? editing.category : "other"} className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Confidentialite<select name="confidentiality" defaultValue={editing !== "new" ? editing.confidentiality : "internal"} className="admin-input">{Object.entries(confidentialityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "draft"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Version<input name="version" type="number" min="1" defaultValue={editing !== "new" ? editing.version : 1} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Televerse par<input name="uploaded_by_name" defaultValue={editing !== "new" ? editing.uploaded_by_name || "" : ""} className="admin-input" /></label>
          <div className="grid gap-2 text-sm font-bold sm:col-span-2">
            Fichier
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-secondary cursor-pointer px-4 py-2 text-sm">{uploading ? "Televersement..." : "Choisir un fichier"}<input type="file" onChange={upload} className="hidden" /></label>
              {filePath && <button type="button" onClick={() => view(filePath)} className="text-sm font-bold text-leaf">Ouvrir le fichier televerse</button>}
            </div>
          </div>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
