"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { generateRegistryCode, getOrgCodeForProject, withUniqueRegistryCode } from "@/lib/ppm/ids";
import { notifyPpmEventClient } from "@/lib/ppm/notify-client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { ApprovalEntityType, ApprovalRequest, ApprovalStatus, ExternalApprover, PPMResource } from "@/lib/ppm/types";

const entityLabels: Record<ApprovalEntityType, { fr: string; en: string }> = {
  charter: { fr: "Charte de projet", en: "Project charter" }, scope_baseline: { fr: "Scope Baseline", en: "Scope Baseline" }, change_request: { fr: "Change Request", en: "Change Request" },
  deliverable: { fr: "Livrable", en: "Deliverable" }, ncr: { fr: "Non-conformite", en: "Non-conformity" }, report: { fr: "Rapport", en: "Report" }, other: { fr: "Autre", en: "Other" },
};
const statusLabels: Record<ApprovalStatus, { fr: string; en: string }> = { pending: { fr: "En attente", en: "Pending" }, approved: { fr: "Approuve", en: "Approved" }, rejected: { fr: "Rejete", en: "Rejected" } };
const statusTones: Record<ApprovalStatus, string> = { pending: "bg-amber-50 text-amber-800", approved: "bg-mint text-forest", rejected: "bg-red-50 text-red-700" };

export default function ApprovalRequestManager({ projectId, projectName, initial, externalApprovers = [], staff = [] }: {
  projectId: string; projectName: string; initial: ApprovalRequest[]; externalApprovers?: ExternalApprover[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [approverId, setApproverId] = useState("");
  const [deciding, setDeciding] = useState<{ row: ApprovalRequest; status: ApprovalStatus } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const approver = externalApprovers.find(item => item.id === approverId);
    const payload = {
      project_id: projectId,
      entity_type: String(form.get("entity_type") || "other") as ApprovalEntityType,
      entity_label: String(form.get("entity_label") || "").trim() || null,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      requested_by_name: String(form.get("requested_by_name") || "").trim() || null,
      requested_by_email: String(form.get("requested_by_email") || "").trim() || null,
      approver_name: approver?.name || null,
      approver_email: approver?.email || null,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    if (!approver) { setSaving(false); setMessage(en ? "Select an external approver." : "Selectionnez un approbateur externe."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // Refinement program, Wave 8 (item 44): every external approval request gets an auto-
    // generated unique registry code, same convention as every other registry this program adds.
    const orgCode = await getOrgCodeForProject(supabase, projectId);
    const result = await withUniqueRegistryCode<ApprovalRequest>(
      async code => await supabase.from("ppm_approval_requests").insert({ ...payload, code, created_by: user?.id }).select("*").single(),
      () => generateRegistryCode(orgCode, "external_approval"),
    );
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const created = result.data as ApprovalRequest;
    setRows(current => [created, ...current]);
    await notifyPpmEventClient({
      recipient: { email: created.approver_email || undefined },
      projectId, category: "approval",
      titleFr: `Approbation demandee — ${created.title}`, titleEn: `Approval requested — ${created.title}`,
      messageFr: `${created.requested_by_name || "Un membre de l'equipe"} attend votre decision sur "${projectName}".`,
      messageEn: `${created.requested_by_name || "A team member"} is awaiting your decision on "${projectName}".`,
      link: `/op-management/projets/${projectId}/suivi-controle/approbations`,
      emailTemplateId: "ppm_external_approval_requested",
      emailVariables: { entity_label: created.title, item_title: created.title, project_name: projectName },
    });
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Demande d'approbation — ${created.title}`, to_status: "pending", note: entityLabels[created.entity_type].fr });
    setApproverId("");
    setCreating(false);
  }

  function startDecision(row: ApprovalRequest, status: ApprovalStatus) {
    setMessage("");
    setDeciding({ row, status });
  }

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deciding) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const decisionNote = String(form.get("decision_note") || "").trim() || null;
    const decidedByName = String(form.get("decided_by_name") || "").trim() || null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_approval_requests").update({
      status: deciding.status, decision_note: decisionNote, decided_by_name: decidedByName, decided_at: new Date().toISOString(),
    }).eq("id", deciding.row.id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const updated = result.data as ApprovalRequest;
    setRows(current => current.map(row => row.id === updated.id ? updated : row));
    if (updated.requested_by_email) {
      await notifyPpmEventClient({
        recipient: { email: updated.requested_by_email }, projectId, category: "info",
        titleFr: `${statusLabels[updated.status].fr} — ${updated.title}`, titleEn: `${statusLabels[updated.status].en} — ${updated.title}`,
        messageFr: decisionNote || undefined, messageEn: decisionNote || undefined,
        link: `/op-management/projets/${projectId}/suivi-controle/approbations`,
      });
    }
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Approbation — ${updated.title}`, from_status: "pending", to_status: updated.status, note: decisionNote || undefined });
    setDeciding(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Approval workflows" : "Workflows d'approbation"}</h2><button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New request" : "Nouvelle demande"}</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>{row.code && <span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.code}</span>}<b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{entityLabels[row.entity_type][locale]}{row.entity_label ? ` · ${row.entity_label}` : ""}{row.approver_name ? ` · ${en ? "Approver" : "Approbateur"} : ${row.approver_name}` : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span>
        </div>
        {row.description && <p className="mt-2 text-sm text-slate-600">{row.description}</p>}
        {row.decision_note && <p className="mt-2 text-sm text-slate-600"><b>{en ? "Decision:" : "Decision :"}</b> {row.decision_note}</p>}
        {row.status === "pending" && <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => startDecision(row, "approved")} className="btn-primary px-3 py-1.5 text-xs">{en ? "Approve" : "Approuver"}</button>
          <button onClick={() => startDecision(row, "rejected")} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Reject" : "Rejeter"}</button>
        </div>}
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No approval request." : "Aucune demande d'approbation."}</p>}
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submitCreate} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "New approval request" : "Nouvelle demande d'approbation"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Entity type" : "Type d'entite"}<select name="entity_type" className="admin-input">{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Reference (e.g. v2, deliverable title...)" : "Reference (ex : v2, titre du livrable...)"}<input name="entity_label" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Requester" : "Demandeur"}<SearchableSelect name="requested_by_name" options={staffOptions} allowOther otherLabel={en ? "Requester name" : "Nom du demandeur"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Requester email" : "Email du demandeur"}<input name="requested_by_email" type="email" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">
            {en ? "External approver" : "Approbateur externe"}
            <select value={approverId} onChange={event => setApproverId(event.target.value)} required className="admin-input">
              <option value="">{externalApprovers.length ? (en ? "Select..." : "Selectionner...") : (en ? "No external approver registered — create one first" : "Aucun approbateur externe enregistre — creez-en un d'abord")}</option>
              {externalApprovers.map(item => <option key={item.id} value={item.id}>{item.name}{item.organization ? ` — ${item.organization}` : ""}</option>)}
            </select>
          </label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Send request" : "Envoyer la demande")}</button></div>
        </div>
      </form>
    </div>}

    {deciding && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submitDecision} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{deciding.status === "approved" ? (en ? "Approve" : "Approuver") : (en ? "Reject" : "Rejeter")} — {deciding.row.title}</h2><button type="button" onClick={() => setDeciding(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Decided by" : "Decide par"}<SearchableSelect name="decided_by_name" options={staffOptions} defaultValue={deciding.row.approver_name || ""} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Decision note" : "Note de decision"}<textarea name="decision_note" rows={3} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setDeciding(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Confirm" : "Confirmer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
