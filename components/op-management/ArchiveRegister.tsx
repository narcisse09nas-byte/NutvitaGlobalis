"use client";
// Refinement program, Wave 8 (item 49): Archiving becomes a register, pre-filled with already-
// accepted deliverables/documents, plus a form to add any other document (with file attachment).
import { useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { generateRegistryCode, getOrgCodeForProject, withUniqueRegistryCode } from "@/lib/ppm/ids";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { ArchiveItem, Deliverable, PPMDocument } from "@/lib/ppm/types";

export default function ArchiveRegister({ projectId, initial, deliverables, documents }: {
  projectId: string; initial: ArchiveItem[]; deliverables: Deliverable[]; documents: PPMDocument[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const archivedDeliverableIds = new Set(rows.filter(item => item.source_type === "deliverable").map(item => item.source_id));
  const archivedDocumentIds = new Set(rows.filter(item => item.source_type === "document").map(item => item.source_id));
  const suggestedDeliverables = deliverables.filter(item => item.acceptance_status === "accepted" && !archivedDeliverableIds.has(item.id));
  const suggestedDocuments = documents.filter(item => item.status === "final" && !archivedDocumentIds.has(item.id));

  async function archiveOne(input: { title: string; source_type: ArchiveItem["source_type"]; source_id?: string; file_path?: string }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgCode = await getOrgCodeForProject(supabase, projectId);
    const result = await withUniqueRegistryCode<ArchiveItem>(
      async code => await supabase.from("ppm_archive_items").insert({
        project_id: projectId, code, title: input.title, source_type: input.source_type,
        source_id: input.source_id || null, file_path: input.file_path || null, created_by: user?.id,
      }).select("*").single(),
      () => generateRegistryCode(orgCode, "archive"),
    );
    if (!result.error) setRows(current => [result.data as ArchiveItem, ...current]);
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/${projectId}/archive/${crypto.randomUUID()}-${safe}`;
    const { error } = await createClient().storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    setUploading(false);
    if (error) { setMessage(error.message); return; }
    setFilePath(path);
  }

  async function viewFile(path?: string | null) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    await archiveOne({ title, source_type: "other", file_path: filePath || undefined });
    setSaving(false);
    setFilePath("");
    setAdding(false);
  }

  return <div className="grid gap-4">
    <h2 className="text-lg font-black text-forest">6. {en ? "Archiving" : "Archivage"}</h2>

    {(!!suggestedDeliverables.length || !!suggestedDocuments.length) && <div className="rounded-2xl border border-dashed bg-mint/30 p-4">
      <p className="text-sm font-bold text-forest">{en ? "Suggestions (accepted deliverables / final documents not yet archived)" : "Suggestions (livrables acceptes / documents finaux pas encore archives)"}</p>
      <div className="mt-2 grid gap-2">
        {suggestedDeliverables.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-2 text-sm"><span>{en ? "Deliverable" : "Livrable"} — {item.title}</span><button onClick={() => archiveOne({ title: item.title, source_type: "deliverable", source_id: item.id, file_path: item.file_path })} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Archive" : "Archiver"}</button></div>)}
        {suggestedDocuments.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-2 text-sm"><span>{en ? "Document" : "Document"} — {item.title}</span><button onClick={() => archiveOne({ title: item.title, source_type: "document", source_id: item.id, file_path: item.file_path })} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Archive" : "Archiver"}</button></div>)}
      </div>
    </div>}

    <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{rows.length} {en ? "archived item(s)" : "element(s) archive(s)"}</p><button type="button" onClick={() => setAdding(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "Add another document" : "Ajouter un autre document"}</button></div>
    <div className="grid gap-2">
      {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-sm">
        <div>{row.code && <span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.code}</span>}<b className="text-forest">{row.title}</b></div>
        {row.file_path && <button onClick={() => viewFile(row.file_path)} className="text-xs font-bold text-leaf">{en ? "View" : "Voir"}</button>}
      </div>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-6 text-center text-slate-400">{en ? "No archived item." : "Aucun element archive."}</p>}
    </div>

    {adding && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Add a document to the archive" : "Ajouter un document a l'archive"}</h2><button type="button" onClick={() => setAdding(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Title" : "Titre"}<input name="title" required className="admin-input" /></label>
          <div className="grid gap-2 text-sm font-bold">
            {en ? "File" : "Fichier"}
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{uploading ? (en ? "Uploading..." : "Televersement...") : (en ? "Choose a file" : "Choisir un fichier")}<input type="file" onChange={uploadFile} className="hidden" /></label>
              {filePath && <button type="button" onClick={() => viewFile(filePath)} className="text-sm font-bold text-leaf">{en ? "View the uploaded file" : "Voir le fichier televerse"}</button>}
            </div>
          </div>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAdding(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Archive" : "Archiver")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
