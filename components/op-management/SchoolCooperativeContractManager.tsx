"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { OpsCooperative, OpsSchoolCooperativeContract, OpsSite } from "@/lib/ppm/types";

const statusLabels: Record<OpsSchoolCooperativeContract["status"], { fr: string; en: string }> = {
  draft: { fr: "Brouillon", en: "Draft" }, active: { fr: "Actif", en: "Active" }, expired: { fr: "Expire", en: "Expired" }, terminated: { fr: "Resilie", en: "Terminated" },
};

export default function SchoolCooperativeContractManager({ operationId, initial, sites, cooperatives }: {
  operationId: string; initial: OpsSchoolCooperativeContract[]; sites: OpsSite[]; cooperatives: OpsCooperative[];
}) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<"new" | null>(null);
  const [filePath, setFilePath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  const cooperativeName = (id: string) => cooperatives.find(item => item.id === id)?.name || "—";

  async function uploadDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/ops/contracts/${operationId}/${crypto.randomUUID()}-${safe}`;
    const { error } = await createClient().storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    setUploading(false);
    if (error) { setMessage(error.message); return; }
    setFilePath(path);
  }

  async function viewDocument(path?: string | null) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      site_id: String(form.get("site_id") || ""),
      cooperative_id: String(form.get("cooperative_id") || ""),
      start_date: String(form.get("start_date") || ""),
      end_date: String(form.get("end_date") || "") || null,
      document_file_path: filePath || null,
      status: String(form.get("status") || "draft") as OpsSchoolCooperativeContract["status"],
    };
    if (!payload.site_id || !payload.cooperative_id || !payload.start_date) { setSaving(false); setMessage(en ? "School, cooperative and start date are required." : "L'ecole, la cooperative et la date de debut sont obligatoires."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_ops_school_cooperative_contracts").insert({ ...payload, created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => [result.data as OpsSchoolCooperativeContract, ...current]);
    setFilePath("");
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "School-cooperative contracts" : "Contrats ecole-cooperative"}</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New contract" : "Nouveau contrat"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "School" : "Ecole"}</th><th className="p-4">{en ? "Cooperative" : "Cooperative"}</th><th className="p-4">{en ? "Period" : "Periode"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{siteName(row.site_id)}</b></td>
            <td className="p-4">{cooperativeName(row.cooperative_id)}</td>
            <td className="p-4">{new Date(row.start_date).toLocaleDateString(en ? "en-US" : "fr-FR")} → {row.end_date ? new Date(row.end_date).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}</td>
            <td className="p-4">{statusLabels[row.status][locale]}</td>
            <td className="p-4">{row.document_file_path && <button onClick={() => viewDocument(row.document_file_path)} className="text-xs font-bold text-leaf">{en ? "View document" : "Voir le document"}</button>}</td>
          </tr>)}
          {!rows.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">{en ? "No contract registered." : "Aucun contrat enregistre."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New contract" : "Nouveau contrat"}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "School" : "Ecole"}<select name="site_id" required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{sites.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Cooperative" : "Cooperative"}<select name="cooperative_id" required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{cooperatives.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">{en ? "Start date" : "Date de debut"}<input name="start_date" type="date" required className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "End date" : "Date de fin"}<input name="end_date" type="date" className="admin-input" /></label>
          </div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue="draft" className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <div className="grid gap-2 text-sm font-bold">
            {en ? "Contract document" : "Document du contrat"}
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{uploading ? (en ? "Uploading..." : "Televersement...") : (en ? "Choose a file" : "Choisir un fichier")}<input type="file" onChange={uploadDocument} className="hidden" /></label>
              {filePath && <button type="button" onClick={() => viewDocument(filePath)} className="text-sm font-bold text-leaf">{en ? "View the uploaded file" : "Voir le fichier televerse"}</button>}
            </div>
          </div>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
