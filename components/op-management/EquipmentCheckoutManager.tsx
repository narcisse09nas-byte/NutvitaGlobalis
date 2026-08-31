"use client";
import { useEffect, useState, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import WorkflowStatusActions, { type WorkflowAction, type WorkflowHistoryEntry } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, ApprovalWorkflowStatus, AuditLogEntry, EquipmentCheckout, EquipmentCheckoutStatus, PPMResource } from "@/lib/ppm/types";

const statusLabels: Record<EquipmentCheckoutStatus, { fr: string; en: string }> = {
  pending_endorsement: { fr: "En attente d'endossement", en: "Awaiting endorsement" },
  checked_out: { fr: "Sorti", en: "Checked out" },
  return_requested: { fr: "Retour demande", en: "Return requested" },
  returned: { fr: "Retourne", en: "Returned" },
  lost: { fr: "Perdu", en: "Lost" }, damaged: { fr: "Endommage", en: "Damaged" },
};
const statusTones: Record<EquipmentCheckoutStatus, string> = {
  pending_endorsement: "bg-sky-50 text-sky-800", checked_out: "bg-amber-50 text-amber-800",
  return_requested: "bg-orange/10 text-orange", returned: "bg-mint text-forest",
  lost: "bg-red-50 text-red-700", damaged: "bg-red-50 text-red-700",
};
const NEXT_ACTIONS: Record<EquipmentCheckoutStatus, WorkflowAction[]> = {
  pending_endorsement: [],
  checked_out: [
    { value: "return_requested", label: "Demander le retour (au nom du staff)", tone: "ghost" },
    { value: "returned", label: "Forcer le retour", tone: "ghost", requireNote: true },
    { value: "lost", label: "Declarer perdu", tone: "danger", requireNote: true },
    { value: "damaged", label: "Declarer endommage", tone: "danger", requireNote: true },
  ],
  return_requested: [{ value: "returned", label: "Endosser le retour", tone: "primary", requireNote: true }],
  returned: [], lost: [], damaged: [],
};
const approvalLabels:Record<ApprovalWorkflowStatus,{fr:string;en:string}>={draft:{fr:"Brouillon",en:"Draft"},submitted:{fr:"Soumise",en:"Submitted"},verified:{fr:"Verifiee",en:"Verified"},approved:{fr:"Approuvee",en:"Approved"},returned:{fr:"Retournee",en:"Returned"},rejected:{fr:"Rejetee",en:"Rejected"}};
const approvalTones:Record<ApprovalWorkflowStatus,string>={draft:"bg-slate-100 text-slate-600",submitted:"bg-sky-50 text-sky-800",verified:"bg-amber-50 text-amber-800",approved:"bg-mint text-forest",returned:"bg-orange/10 text-orange",rejected:"bg-red-50 text-red-700"};
const approvalActions=(status:ApprovalWorkflowStatus):WorkflowAction[]=>status==="draft"||status==="returned"?[{value:"submitted",label:"Soumettre",tone:"primary",requireNote:true}]:status==="submitted"?[{value:"verified",label:"Verifier",tone:"primary",requireNote:true},{value:"returned",label:"Retourner",requireNote:true}]:status==="verified"?[{value:"approved",label:"Approuver",tone:"primary",requireNote:true},{value:"returned",label:"Retourner",requireNote:true}]:[];

export default function EquipmentCheckoutManager({ projectId, initial, assets, activities, staff = [] }: {
  projectId: string; initial: EquipmentCheckout[]; assets: PPMResource[]; activities: Activity[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<"new" | null>(null);
  const [detailFor, setDetailFor] = useState<EquipmentCheckout | null>(null);
  const [assignedResourceId, setAssignedResourceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const assetLabel = (id: string) => assets.find(item => item.id === id)?.name || "—";
  const activityLabel = (id?: string | null) => activities.find(item => item.id === id)?.title || "—";
  const staffLabel = (id?: string | null) => staff.find(item => item.id === id)?.name || "—";
  const staffOptions = staff.map(item => ({ value: item.id, label: item.name, hint: item.user_id ? (en ? "Has a login" : "A un compte") : (en ? "No login yet" : "Pas encore de compte") }));
  const selectedStaff = staff.find(item => item.id === assignedResourceId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    if (!assignedResourceId) { setSaving(false); setMessage(en ? "Select the staff member." : "Selectionnez le membre du staff."); return; }
    const payload = {
      project_id: projectId,
      resource_id: String(form.get("resource_id") || ""),
      activity_id: String(form.get("activity_id") || "") || null,
      assigned_resource_id: assignedResourceId,
      user_name: staffLabel(assignedResourceId),
      checkout_date: String(form.get("checkout_date") || "") || null,
      expected_return_date: String(form.get("expected_return_date") || "") || null,
      condition_out: String(form.get("condition_out") || "").trim() || null,
      workflow_status: "draft" as ApprovalWorkflowStatus,
    };
    if (!payload.resource_id) { setSaving(false); setMessage(en ? "Asset is required." : "L'actif est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const status: EquipmentCheckoutStatus = selectedStaff?.user_id ? "pending_endorsement" : "checked_out";
    const result = await supabase.from("ppm_equipment_checkouts").insert({ ...payload, status, assigned_by: user?.id, created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const created = result.data as EquipmentCheckout;
    await supabase.from("ppm_history").insert({ entity_type: "asset_assignment", entity_id: created.id, actor_id: user?.id, action: `Actif attribue a ${payload.user_name}`, to_status: status });
    setRows(current => [created, ...current]);
    setEditing(null);
    setAssignedResourceId("");
  }

  async function changeApproval(row:EquipmentCheckout,nextStatus:string,reviewedByName:string|null,note:string|null){const supabase=createClient();const from=row.workflow_status||"draft";const result=await supabase.from("ppm_equipment_checkouts").update({workflow_status:nextStatus}).eq("id",row.id).select("*").single();if(result.error)return{error:result.error.message};const{data:{user}}=await supabase.auth.getUser();await supabase.from("ppm_history").insert({entity_type:"asset_assignment",entity_id:row.id,actor_id:user?.id,action:reviewedByName||nextStatus,from_status:from,to_status:nextStatus,note});setRows(current=>current.map(item=>item.id===row.id?result.data as EquipmentCheckout:item));}

  async function cancelAssignment(row: EquipmentCheckout) {
    if (!window.confirm(en ? "Cancel this assignment?" : "Annuler cette attribution ?")) return;
    const supabase = createClient();
    const result = await supabase.from("ppm_equipment_checkouts").delete().eq("id", row.id).eq("status", "pending_endorsement");
    if (!result.error) setRows(current => current.filter(item => item.id !== row.id));
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Asset assignment" : "Attribution des actifs"}</h2><button onClick={() => setEditing("new")} disabled={!assets.length} className="btn-primary px-4 py-2 text-sm disabled:opacity-40"><PlusIcon className="mr-2 h-4" />{en ? "New assignment" : "Nouvelle attribution"}</button></div>
    {!assets.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "Register at least one asset before assigning it." : "Enregistrez au moins un actif avant de l'attribuer."}</p>}
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">ID</th><th className="p-3">{en ? "Asset" : "Actif"}</th><th className="p-3">{en ? "Assigned to" : "Attribue a"}</th><th className="p-3">{en ? "Activity" : "Activite"}</th><th className="p-3">{en ? "Checkout" : "Sortie"}</th><th className="p-3">{en ? "Expected return" : "Retour prevu"}</th><th className="p-3">{en ? "Actual return" : "Retour reel"}</th><th className="p-3">{en ? "Status" : "Statut"}</th><th className="p-3">Workflow</th><th className="p-3">{en ? "Action" : "Action"}</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id} className="border-t align-top"><td className="p-3 font-mono text-xs font-bold">{row.assignment_code||row.id.slice(0,8)}</td><td className="p-3 font-bold text-forest">{assetLabel(row.resource_id)}</td><td className="p-3">{row.user_name || staffLabel(row.assigned_resource_id)}</td><td className="p-3">{activityLabel(row.activity_id)}</td><td className="p-3">{row.checkout_date ? new Date(row.checkout_date).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR") : "-"}</td><td className="p-3">{row.expected_return_date ? new Date(row.expected_return_date).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR") : "-"}</td><td className="p-3">{row.actual_return_date ? new Date(row.actual_return_date).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR") : "-"}</td><td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span>{row.incident_note && <p className="mt-2 max-w-xs text-xs text-red-600">{row.incident_note}</p>}</td><td className="p-3"><WorkflowStatusActions entityLabel={en?"Asset assignment":"Attribution d actif"} itemTitle={assetLabel(row.resource_id)} status={row.workflow_status||"draft"} statusLabels={Object.fromEntries(Object.entries(approvalLabels).map(([key,value])=>[key,value[locale]]))} statusTones={approvalTones} actions={approvalActions(row.workflow_status||"draft")} staff={staff} onConfirm={input=>changeApproval(row,input.nextStatus,input.reviewedByName,input.note)}/></td><td className="p-3"><div className="flex gap-2"><button onClick={() => setDetailFor(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Manage" : "Gerer"}</button>{row.status === "pending_endorsement" && <button onClick={() => cancelAssignment(row)} className="flex items-center gap-1 text-xs font-bold text-red-600"><TrashIcon className="h-3.5" />{en ? "Cancel" : "Annuler"}</button>}</div></td></tr>)}
        {!rows.length && <tr><td colSpan={10} className="p-8 text-center text-slate-400">{en ? "No asset assigned yet." : "Aucun actif attribue pour le moment."}</td></tr>}
      </tbody></table>
    </div>
    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New assignment" : "Nouvelle attribution"}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Asset" : "Actif"}<select name="resource_id" required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{assets.map(item => <option key={item.id} value={item.id}>{item.asset_code ? `${item.asset_code} — ` : ""}{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Activity" : "Activite"}<select name="activity_id" className="admin-input"><option value="">{en ? "None" : "Aucune"}</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Assigned to" : "Attribue a"}<SearchableSelect name="assigned_resource_id" options={staffOptions} onChange={setAssignedResourceId} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          {assignedResourceId && !selectedStaff?.user_id && <p className="rounded-xl bg-sky-50 p-3 text-xs font-bold text-sky-800">{en ? "This staff member has no portal login yet — the assignment will start as checked out directly (no self-endorsement possible until they get an account)." : "Ce membre du staff n'a pas encore de compte portail — l'attribution demarrera directement en sortie (pas d'auto-endossement possible tant qu'il n'a pas de compte)."}</p>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Checkout date" : "Date de sortie"}<input name="checkout_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Expected return" : "Retour prevu"}<input name="expected_return_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Condition on checkout" : "Etat au depart"}<input name="condition_out" className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {detailFor && <CheckoutDetailPanel checkout={detailFor} assetName={assetLabel(detailFor.resource_id)} staff={staff}
      onStatusChanged={updated => setRows(current => current.map(row => row.id === updated.id ? updated : row))} onClose={() => setDetailFor(null)} />}
  </div>;
}

function CheckoutDetailPanel({ checkout, assetName, staff, onStatusChanged, onClose }: {
  checkout: EquipmentCheckout; assetName: string; staff: PPMResource[]; onStatusChanged: (updated: EquipmentCheckout) => void; onClose: () => void;
}) {
  const { en } = usePpmLocale();
  const [status, setStatus] = useState(checkout.status);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    createClient().from("ppm_history").select("*").eq("entity_type", "asset_assignment").eq("entity_id", checkout.id).order("created_at", { ascending: false }).limit(100)
      .then(result => setHistory((result.data || []) as AuditLogEntry[]));
  }, [checkout.id]);

  const historyEntries: WorkflowHistoryEntry[] = history.map(item => ({ status: item.to_status || item.action, at: item.created_at, note: item.note }));

  return <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
    <div className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{assetName}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <div className="mt-4">
        <WorkflowStatusActions
          entityLabel={en ? "Assignment" : "Attribution"} itemTitle={assetName} status={status}
          statusLabels={Object.fromEntries(Object.entries(statusLabels).map(([value, label]) => [value, label[en ? "en" : "fr"]]))}
          statusTones={statusTones} actions={NEXT_ACTIONS[status]} staff={staff}
          history={historyEntries}
          onConfirm={async ({ nextStatus, reviewedByName, note }) => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const extra: Record<string, unknown> = {};
            if (nextStatus === "return_requested") { extra.return_requested_at = new Date().toISOString(); extra.return_requested_note = note; }
            if (nextStatus === "returned") { extra.actual_return_date = new Date().toISOString().slice(0, 10); extra.condition_in = note; extra.return_endorsed_at = new Date().toISOString(); extra.return_endorsed_by = user?.id; }
            if (nextStatus === "lost" || nextStatus === "damaged") extra.incident_note = note;
            const result = await supabase.from("ppm_equipment_checkouts").update({ status: nextStatus, ...extra }).eq("id", checkout.id).select("*").single();
            if (result.error) return { error: result.error.message };
            const updated = result.data as EquipmentCheckout;
            const label = statusLabels[nextStatus as EquipmentCheckoutStatus][en ? "en" : "fr"];
            await supabase.from("ppm_history").insert({ entity_type: "asset_assignment", entity_id: checkout.id, actor_id: user?.id, action: `${label}${reviewedByName ? ` — ${reviewedByName}` : ""}`, from_status: status, to_status: nextStatus, note: note || undefined });
            setStatus(updated.status);
            onStatusChanged(updated);
            setHistory(current => [{ id: crypto.randomUUID(), entity_type: "asset_assignment", entity_id: checkout.id, action: nextStatus, to_status: nextStatus, from_status: status, note: note || undefined, created_at: new Date().toISOString() }, ...current]);
          }}
        />
      </div>
    </div>
  </div>;
}
