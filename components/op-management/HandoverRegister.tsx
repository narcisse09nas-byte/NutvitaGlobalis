"use client";
// Refinement program, Wave 8 (item 48): Handover becomes a register (list + one dedicated form
// per item to transfer) instead of a single free-text section on the closure record — several
// items (equipment, keys, documents, contracts...) may need transferring, each with its own
// recipient and status.
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { generateRegistryCode, getOrgCodeForProject, withUniqueRegistryCode } from "@/lib/ppm/ids";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { DisposalMethod, HandoverItem, HandoverStatus, PPMResource, Stakeholder } from "@/lib/ppm/types";

const statusLabels: Record<HandoverStatus, { fr: string; en: string }> = { pending: { fr: "En attente", en: "Pending" }, handed_over: { fr: "Transfere", en: "Handed over" }, acknowledged: { fr: "Accuse de reception", en: "Acknowledged" } };
const statusTones: Record<HandoverStatus, string> = {
  pending: "bg-slate-100 text-slate-600", handed_over: "bg-sky-50 text-sky-800", acknowledged: "bg-mint text-forest",
};
const disposalLabels: Record<DisposalMethod, { fr: string; en: string }> = {
  transferred_to_project: { fr: "Transfere a un autre projet", en: "Transferred to another project" },
  donated: { fr: "Fait don", en: "Donated" }, sold: { fr: "Vendu", en: "Sold" }, scrapped: { fr: "Mis au rebut", en: "Scrapped" },
  returned_to_donor: { fr: "Retourne au donateur", en: "Returned to donor" }, kept_by_organization: { fr: "Conserve par l'organisation", en: "Kept by the organization" },
  other: { fr: "Autre", en: "Other" },
};

export default function HandoverRegister({ projectId, initial, staff = [], stakeholders = [], assets = [] }: { projectId: string; initial: HandoverItem[]; staff?: PPMResource[]; stakeholders?: Stakeholder[]; assets?: PPMResource[] }) {
  const { locale, en } = usePpmLocale();
  const recipientOptions = [
    ...staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title ? `${item.role_title} (Staff)` : "Staff" })),
    ...stakeholders.map(item => ({ value: item.name, label: item.name, hint: en ? "Stakeholder" : "Partie prenante" })),
  ];
  const assetOptions = assets.map(item => ({ value: item.id, label: `${item.asset_code ? `${item.asset_code} · ` : ""}${item.name}` }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<HandoverItem | "new" | null>(null);
  const [disposalMethod, setDisposalMethod] = useState<DisposalMethod | "">("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      recipient_name: String(form.get("recipient_name") || "").trim() || null,
      recipient_organization: String(form.get("recipient_organization") || "").trim() || null,
      handover_date: String(form.get("handover_date") || "") || null,
      status: String(form.get("status") || "pending") as HandoverStatus,
      notes: String(form.get("notes") || "").trim() || null,
      resource_id: String(form.get("resource_id") || "") || null,
      disposal_method: (disposalMethod || null) as DisposalMethod | null,
      disposal_method_other: disposalMethod === "other" ? (String(form.get("disposal_method_other") || "").trim() || null) : null,
      disposal_amount: disposalMethod === "sold" && form.get("disposal_amount") ? Number(form.get("disposal_amount")) : null,
      disposal_currency: disposalMethod === "sold" ? (String(form.get("disposal_currency") || "").trim() || null) : null,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    let result;
    if (isNew) {
      const orgCode = await getOrgCodeForProject(supabase, projectId);
      result = await withUniqueRegistryCode<HandoverItem>(
        async code => await supabase.from("ppm_handover_items").insert({ ...payload, code, created_by: user?.id }).select("*").single(),
        () => generateRegistryCode(orgCode, "handover"),
      );
    } else {
      result = await supabase.from("ppm_handover_items").update(payload).eq("id", (editing as HandoverItem).id).select("*").single();
    }
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as HandoverItem, ...current] : current.map(row => row.id === result.data.id ? result.data as HandoverItem : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black text-forest">5. {en ? "Handover" : "Transfert (handover)"}</h2><button type="button" onClick={() => { setDisposalMethod(""); setEditing("new"); }} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New item to transfer" : "Nouvel element a transferer"}</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>{row.code && <span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.code}</span>}<b className="text-forest">{row.title}</b>{row.recipient_name && <p className="mt-1 text-xs text-slate-400">{en ? "To" : "Vers"} : {row.recipient_name}{row.recipient_organization ? ` (${row.recipient_organization})` : ""}</p>}{row.disposal_method && <p className="mt-1 text-xs text-slate-400">{en ? "Disposal" : "Disposition"} : {disposalLabels[row.disposal_method][locale]}</p>}</div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span>
        </div>
        <button type="button" onClick={() => { setDisposalMethod(row.disposal_method || ""); setEditing(row); }} className="btn-secondary mt-3 px-3 py-1.5 text-xs">{en ? "Edit" : "Modifier"}</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-6 text-center text-slate-400">{en ? "No handover item recorded." : "Aucun element de transfert enregistre."}</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? (en ? "New item to transfer" : "Nouvel element a transferer") : (en ? "Edit" : "Modifier")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Title (e.g. office keys, vehicle, file X)" : "Titre (ex : cles du bureau, vehicule, dossier X)"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Description" : "Description"}<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Transferred to" : "Transfere a"}<SearchableSelect name="recipient_name" options={recipientOptions} defaultValue={editing !== "new" ? editing.recipient_name || "" : ""} allowOther otherLabel={en ? "Recipient name" : "Nom du destinataire"} placeholder={en ? "Select..." : "Selectionner..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Organization" : "Organisation"}<input name="recipient_organization" defaultValue={editing !== "new" ? editing.recipient_organization || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Handover date" : "Date de transfert"}<input name="handover_date" type="date" defaultValue={editing !== "new" ? editing.handover_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "pending"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {!!assetOptions.length && <label className="grid gap-2 text-sm font-bold">{en ? "Linked asset (if applicable)" : "Actif lie (si applicable)"}<select name="resource_id" defaultValue={editing !== "new" ? editing.resource_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{assetOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Disposal method" : "Mode de disposition"}<select value={disposalMethod} onChange={event => setDisposalMethod(event.target.value as DisposalMethod)} className="admin-input"><option value="">{en ? "Not applicable" : "Non applicable"}</option>{Object.entries(disposalLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {disposalMethod === "other" && <label className="grid gap-2 text-sm font-bold">{en ? "Specify" : "Preciser"}<input name="disposal_method_other" defaultValue={editing !== "new" ? editing.disposal_method_other || "" : ""} className="admin-input" /></label>}
          {disposalMethod === "sold" && <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">{en ? "Sale amount" : "Montant de la vente"}<input name="disposal_amount" type="number" step="0.01" defaultValue={editing !== "new" ? editing.disposal_amount ?? "" : ""} className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Currency" : "Devise"}<input name="disposal_currency" defaultValue={editing !== "new" ? editing.disposal_currency || "XOF" : "XOF"} className="admin-input" /></label>
          </div>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Notes" : "Notes"}<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
