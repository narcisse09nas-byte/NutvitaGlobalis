"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import WorkflowStatusActions, { type WorkflowAction } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generateRegistryCode, getOrgCodeForProject, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type { ApprovalWorkflowStatus, PPMResource, ProcurementItem, Project, ResourceOriginType, ResourceType } from "@/lib/ppm/types";

const originLabels: Record<ResourceOriginType, { fr: string; en: string }> = {
  purchase: { fr: "Achat", en: "Purchase" }, donation: { fr: "Don", en: "Donation" },
  transfer: { fr: "Transfert d'un autre projet", en: "Transfer from another project" },
  internal_production: { fr: "Production interne", en: "Internal production" }, other: { fr: "Autre", en: "Other" },
};
const typeLabels: Record<ResourceType, { fr: string; en: string }> = {
  human: { fr: "Humain", en: "Human" }, consultant: { fr: "Consultant", en: "Consultant" },
  equipment: { fr: "Equipement", en: "Equipment" }, vehicle: { fr: "Vehicule", en: "Vehicle" }, infrastructure: { fr: "Infrastructure", en: "Infrastructure" },
  service: { fr: "Service", en: "Service" }, consumable: { fr: "Consommable", en: "Consumable" }, material: { fr: "Materiel", en: "Material" }, other: { fr: "Autre", en: "Other" },
};
const standardConditions = ["good", "revision_required", "maintenance_planned"] as const;
const workflowLabels: Record<ApprovalWorkflowStatus,{fr:string;en:string}>={draft:{fr:"Brouillon",en:"Draft"},submitted:{fr:"Soumis",en:"Submitted"},verified:{fr:"Verifie",en:"Verified"},approved:{fr:"Approuve",en:"Approved"},returned:{fr:"Retourne",en:"Returned"},rejected:{fr:"Rejete",en:"Rejected"}};
const workflowTones:Record<ApprovalWorkflowStatus,string>={draft:"bg-slate-100 text-slate-600",submitted:"bg-sky-50 text-sky-800",verified:"bg-amber-50 text-amber-800",approved:"bg-mint text-forest",returned:"bg-orange/10 text-orange",rejected:"bg-red-50 text-red-700"};
const workflowActions=(status:ApprovalWorkflowStatus):WorkflowAction[]=>status==="draft"||status==="returned"?[{value:"submitted",label:"Soumettre",tone:"primary",requireNote:true}]:status==="submitted"?[{value:"verified",label:"Verifier",tone:"primary",requireNote:true},{value:"returned",label:"Retourner",requireNote:true},{value:"rejected",label:"Rejeter",tone:"danger",requireNote:true}]:status==="verified"?[{value:"approved",label:"Approuver",tone:"primary",requireNote:true},{value:"returned",label:"Retourner",requireNote:true}]:[];

export default function AssetRegistrationManager({ projectId, initial, procurementItems, projects, staff = [] }: {
  projectId: string; initial: PPMResource[]; procurementItems: ProcurementItem[]; projects: Project[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<PPMResource | "new" | null>(null);
  const [originType, setOriginType] = useState<ResourceOriginType | "">("");
  const [conditionStatus, setConditionStatus] = useState("");
  const [assetType, setAssetType] = useState<ResourceType>("equipment");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const registered = rows.filter(item => item.origin_type);
  const planned = rows.filter(item => !item.origin_type);
  const procurementOptions = procurementItems.map(item => ({ value: item.id, label: item.title, hint: item.po_reference ? `PO ${item.po_reference}${item.supplier_name ? ` · ${item.supplier_name}` : ""}` : item.stage }));
  const transferProjectOptions = projects.filter(item => item.id !== projectId).map(item => ({ value: item.id, label: item.name }));
  const originName = (row: PPMResource) => {
    if (row.origin_type === "purchase") { const item = procurementItems.find(p => p.id === row.origin_procurement_item_id); return item ? `${item.title}${item.po_reference ? ` (PO ${item.po_reference})` : ""}` : "—"; }
    if (row.origin_type === "donation") return row.origin_donor_name || "—";
    if (row.origin_type === "transfer") return projects.find(p => p.id === row.origin_transfer_project_id)?.name || "—";
    if (row.origin_type === "other") return row.origin_other_detail || "—";
    return row.origin_type ? originLabels[row.origin_type][locale] : "—";
  };

  function openEditor(row: PPMResource | "new") {
    setMessage("");
    setOriginType(row !== "new" ? (row.origin_type || "") : "");
    setEditing(row);
  }

  async function changeWorkflow(row:PPMResource,nextStatus:string,reviewedByName:string|null,note:string|null){const supabase=createClient();const from=row.asset_workflow_status||"draft";const result=await supabase.from("ppm_resources").update({asset_workflow_status:nextStatus}).eq("id",row.id).select("*").single();if(result.error)return{error:result.error.message};const{data:{user}}=await supabase.auth.getUser();await supabase.from("ppm_history").insert({entity_type:"asset",entity_id:row.id,actor_id:user?.id,action:reviewedByName||nextStatus,from_status:from,to_status:nextStatus,note});setRows(current=>current.map(item=>item.id===row.id?result.data as PPMResource:item));}

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      project_id: projectId,
      name: String(form.get("name") || "").trim(),
      type: assetType,
      type_other_detail: assetType === "other" ? String(form.get("type_other_detail") || "").trim() || null : null,
      origin_type: (originType || null) as ResourceOriginType | null,
      origin_procurement_item_id: originType === "purchase" ? (String(form.get("origin_procurement_item_id") || "") || null) : null,
      origin_donor_name: originType === "donation" ? (String(form.get("origin_donor_name") || "").trim() || null) : null,
      origin_transfer_project_id: originType === "transfer" ? (String(form.get("origin_transfer_project_id") || "") || null) : null,
      origin_other_detail: originType === "other" ? (String(form.get("origin_other_detail") || "").trim() || null) : null,
      origin_notes: String(form.get("origin_notes") || "").trim() || null,
      cost_rate: form.get("cost_rate") ? Number(form.get("cost_rate")) : null,
      currency: String(form.get("currency") || "").trim() || null,
      condition_notes: conditionStatus === "other"
        ? String(form.get("condition_other") || "").trim() || "other"
        : conditionStatus || null,
      current_location: String(form.get("current_location") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      status: String(form.get("status") || "active") === "on_hold" ? "on_hold" : "active",
      asset_workflow_status: editing && editing !== "new" ? editing.asset_workflow_status || "draft" : "draft",
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const wasUnregistered = !isNew && !(editing as PPMResource).origin_type;
    const nowRegistering = !!originType && (isNew || wasUnregistered);
    if (nowRegistering) { payload.registered_at = new Date().toISOString(); payload.registered_by = user?.id; }

    let result;
    if (isNew) {
      const orgCode = await getOrgCodeForProject(supabase, projectId);
      result = await withUniqueRegistryCode<PPMResource>(
        async code => await supabase.from("ppm_resources").insert({ ...payload, asset_code: code, created_by: user?.id }).select("*").single(),
        () => generateRegistryCode(orgCode, "asset"),
      );
    } else {
      const updatePayload = { ...payload } as Record<string, unknown>;
      if (nowRegistering && !(editing as PPMResource).asset_code) {
        const orgCode = await getOrgCodeForProject(supabase, projectId);
        const coded = await withUniqueRegistryCode<PPMResource>(
          async code => await supabase.from("ppm_resources").update({ ...updatePayload, asset_code: code }).eq("id", (editing as PPMResource).id).select("*").single(),
          () => generateRegistryCode(orgCode, "asset"),
        );
        result = coded;
      } else {
        result = await supabase.from("ppm_resources").update(updatePayload).eq("id", (editing as PPMResource).id).select("*").single();
      }
    }
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as PPMResource;
    if (nowRegistering) await supabase.from("ppm_history").insert({ entity_type: "asset", entity_id: saved.id, actor_id: user?.id, action: `Actif enregistre — ${originType ? originLabels[originType as ResourceOriginType][locale] : ""}`, note: saved.name });
    setRows(current => isNew ? [saved, ...current] : current.map(row => row.id === saved.id ? saved : row));
    setEditing(null);
    router.refresh();
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Assets" : "Actifs"}</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New asset" : "Nouvel actif"}</button></div>

    <div className="grid gap-3">
      <h3 className="text-sm font-black uppercase text-slate-500">{en ? "Registered" : "Enregistres"}</h3>
      <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Asset ID" : "ID actif"}</th><th className="p-3">{en ? "Asset" : "Actif"}</th><th className="p-3">{en ? "Type" : "Type"}</th><th className="p-3">{en ? "Origin" : "Origine"}</th><th className="p-3">{en ? "Location" : "Localisation"}</th><th className="p-3">{en ? "Condition" : "Etat"}</th><th className="p-3">{en ? "Status" : "Statut"}</th><th className="p-3">Workflow</th><th className="p-3">{en ? "Action" : "Action"}</th></tr></thead><tbody>
        {registered.map(row => <tr key={row.id} className="border-t align-top"><td className="p-3 font-mono text-xs font-bold text-slate-500">{row.asset_code || "-"}</td><td className="p-3 font-bold text-forest">{row.name}</td><td className="p-3">{row.type === "other" ? row.type_other_detail || typeLabels.other[locale] : typeLabels[row.type][locale]}</td><td className="p-3">{row.origin_type ? `${originLabels[row.origin_type][locale]} : ${originName(row)}` : "-"}</td><td className="p-3">{row.current_location || "-"}</td><td className="p-3">{row.condition_notes || "-"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === "active" ? "bg-mint text-forest" : "bg-slate-100 text-slate-600"}`}>{row.status === "active" ? (en ? "Active" : "Actif") : (en ? "Inactive" : "Inactif")}</span></td><td className="p-3"><WorkflowStatusActions entityLabel={en?"Asset":"Actif"} itemTitle={row.name} status={row.asset_workflow_status||"draft"} statusLabels={Object.fromEntries(Object.entries(workflowLabels).map(([key,value])=>[key,value[locale]]))} statusTones={workflowTones} actions={workflowActions(row.asset_workflow_status||"draft")} staff={staff} onConfirm={input=>changeWorkflow(row,input.nextStatus,input.reviewedByName,input.note)}/></td><td className="p-3"><button onClick={() => openEditor(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Edit" : "Modifier"}</button></td></tr>)}
        {!registered.length && <tr><td colSpan={9} className="p-8 text-center text-slate-400">{en ? "No registered asset yet." : "Aucun actif enregistre pour le moment."}</td></tr>}
      </tbody></table></div>
    </div>

    <div className="grid gap-3">
      <h3 className="text-sm font-black uppercase text-slate-500">{en ? "Planned, not yet registered" : "Planifies, pas encore enregistres"}</h3>
      <div className="overflow-x-auto rounded-2xl border border-dashed bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Asset" : "Actif"}</th><th className="p-3">{en ? "Type" : "Type"}</th><th className="p-3">{en ? "Planned value" : "Valeur planifiee"}</th><th className="p-3">{en ? "Condition" : "Etat"}</th><th className="p-3">{en ? "Status" : "Statut"}</th><th className="p-3">Workflow</th><th className="p-3">{en ? "Action" : "Action"}</th></tr></thead><tbody>
        {planned.map(row => <tr key={row.id} className="border-t"><td className="p-3 font-bold text-forest">{row.name}</td><td className="p-3">{row.type === "other" ? row.type_other_detail || typeLabels.other[locale] : typeLabels[row.type][locale]}</td><td className="p-3">{row.cost_rate ?? "-"} {row.currency || ""}</td><td className="p-3">{row.condition_notes || "-"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === "active" ? "bg-mint text-forest" : "bg-slate-100 text-slate-600"}`}>{row.status === "active" ? (en ? "Active" : "Actif") : (en ? "Inactive" : "Inactif")}</span></td><td className="p-3"><WorkflowStatusActions entityLabel={en?"Asset":"Actif"} itemTitle={row.name} status={row.asset_workflow_status||"draft"} statusLabels={Object.fromEntries(Object.entries(workflowLabels).map(([key,value])=>[key,value[locale]]))} statusTones={workflowTones} actions={workflowActions(row.asset_workflow_status||"draft")} staff={staff} onConfirm={input=>changeWorkflow(row,input.nextStatus,input.reviewedByName,input.note)}/></td><td className="p-3"><button onClick={() => openEditor(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Register origin" : "Enregistrer l'origine"}</button></td></tr>)}
        {!planned.length && <tr><td colSpan={7} className="p-8 text-center text-slate-400">{en ? "No planned asset awaiting registration." : "Aucun actif planifie en attente d'enregistrement."}</td></tr>}
      </tbody></table></div>
    </div>
    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editing === "new" ? (en ? "New asset" : "Nouvel actif") : (en ? "Edit asset" : "Modifier l'actif")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Name" : "Nom"}<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <div className="grid gap-3"><label className="grid gap-2 text-sm font-bold">{en ? "Type" : "Type"}<select name="type" value={assetType} onChange={event => setAssetType(event.target.value as ResourceType)} className="admin-input"><option value="equipment">{typeLabels.equipment[locale]}</option><option value="vehicle">{typeLabels.vehicle[locale]}</option><option value="infrastructure">{typeLabels.infrastructure[locale]}</option><option value="other">{en ? "Other (specify)" : "Autre a preciser"}</option></select></label>{assetType === "other" && <label className="grid gap-2 text-sm font-bold">{en ? "Specify the asset type" : "Preciser le type d'actif"}<input name="type_other_detail" defaultValue={editing !== "new" ? editing.type_other_detail || "" : ""} required className="admin-input" /></label>}</div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Origin" : "Origine"}<select value={originType} onChange={event => setOriginType(event.target.value as ResourceOriginType)} className="admin-input"><option value="">{en ? "Not specified yet" : "Non precisee pour le moment"}</option>{Object.entries(originLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          {originType === "purchase" && <label className="grid gap-2 text-sm font-bold">{en ? "Purchase" : "Achat"}<SearchableSelect name="origin_procurement_item_id" options={procurementOptions} defaultValue={editing !== "new" ? editing.origin_procurement_item_id || "" : ""} placeholder={en ? "Select the purchase..." : "Selectionner l'achat..."} /></label>}
          {originType === "donation" && <label className="grid gap-2 text-sm font-bold">{en ? "Donor" : "Donateur"}<input name="origin_donor_name" defaultValue={editing !== "new" ? editing.origin_donor_name || "" : ""} className="admin-input" /></label>}
          {originType === "transfer" && <label className="grid gap-2 text-sm font-bold">{en ? "Source project" : "Projet source"}<SearchableSelect name="origin_transfer_project_id" options={transferProjectOptions} defaultValue={editing !== "new" ? editing.origin_transfer_project_id || "" : ""} placeholder={en ? "Select the project..." : "Selectionner le projet..."} /></label>}
          {originType === "other" && <label className="grid gap-2 text-sm font-bold">{en ? "Specify" : "Preciser"}<input name="origin_other_detail" defaultValue={editing !== "new" ? editing.origin_other_detail || "" : ""} className="admin-input" /></label>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Origin notes" : "Notes sur l'origine"}<textarea name="origin_notes" rows={2} defaultValue={editing !== "new" ? editing.origin_notes || "" : ""} className="admin-input" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">{en ? "Value" : "Valeur"}<input name="cost_rate" type="number" step="0.01" defaultValue={editing !== "new" ? editing.cost_rate ?? "" : ""} className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Currency" : "Devise"}<input name="currency" defaultValue={editing !== "new" ? editing.currency || "XOF" : "XOF"} className="admin-input" /></label>
          </div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Current location" : "Localisation actuelle"}<input name="current_location" defaultValue={editing !== "new" ? editing.current_location || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? (editing.status === "on_hold" ? "on_hold" : "active") : "active"} className="admin-input"><option value="active">{en ? "Active" : "Actif"}</option><option value="on_hold">{en ? "Inactive" : "Inactif"}</option></select></label>
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-bold">{en ? "Condition" : "Etat"}<select value={conditionStatus} onChange={event => setConditionStatus(event.target.value)} className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option><option value="good">{en ? "Good condition" : "Bon etat"}</option><option value="revision_required">{en ? "Revision required" : "Revision necessaire"}</option><option value="maintenance_planned">{en ? "Maintenance planned" : "Maintenance prevue"}</option><option value="other">{en ? "Other (specify)" : "Autre a preciser"}</option></select></label>
            {conditionStatus === "other" && <label className="grid gap-2 text-sm font-bold">{en ? "Specify the condition" : "Preciser l'etat"}<textarea name="condition_other" rows={2} defaultValue={editing !== "new" && !standardConditions.includes((editing.condition_notes || "") as typeof standardConditions[number]) ? editing.condition_notes || "" : ""} className="admin-input" /></label>}
          </div>
          <label className="grid gap-2 text-sm font-bold">{en ? "Notes" : "Notes"}<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
