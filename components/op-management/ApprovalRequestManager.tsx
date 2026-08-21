"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { ApprovalEntityType, ApprovalRequest, ApprovalStatus } from "@/lib/ppm/types";

const entityLabels: Record<ApprovalEntityType, string> = {
  charter: "Charte de projet", scope_baseline: "Scope Baseline", change_request: "Change Request",
  deliverable: "Livrable", ncr: "Non-conformite", report: "Rapport", other: "Autre",
};
const statusLabels: Record<ApprovalStatus, string> = { pending: "En attente", approved: "Approuve", rejected: "Rejete" };
const statusTones: Record<ApprovalStatus, string> = { pending: "bg-amber-50 text-amber-800", approved: "bg-mint text-forest", rejected: "bg-red-50 text-red-700" };

export default function ApprovalRequestManager({ projectId, projectName, initial }: { projectId: string; projectName: string; initial: ApprovalRequest[] }) {
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [deciding, setDeciding] = useState<{ row: ApprovalRequest; status: ApprovalStatus } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      entity_type: String(form.get("entity_type") || "other") as ApprovalEntityType,
      entity_label: String(form.get("entity_label") || "").trim() || null,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      requested_by_name: String(form.get("requested_by_name") || "").trim() || null,
      requested_by_email: String(form.get("requested_by_email") || "").trim() || null,
      approver_name: String(form.get("approver_name") || "").trim() || null,
      approver_email: String(form.get("approver_email") || "").trim() || null,
    };
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_approval_requests").insert({ ...payload, created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const created = result.data as ApprovalRequest;
    setRows(current => [created, ...current]);
    if (created.approver_email) {
      await supabase.from("ppm_notifications").insert({
        recipient_email: created.approver_email, project_id: projectId, category: "approval",
        title: `Approbation demandee — ${created.title}`,
        message: `${created.requested_by_name || "Un membre de l'equipe"} attend votre decision sur "${projectName}".`,
        link: `/op-management/projets/${projectId}/suivi-controle/approbations`,
      });
    }
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Demande d'approbation — ${created.title}`, to_status: "pending", note: entityLabels[created.entity_type] });
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
      await supabase.from("ppm_notifications").insert({
        recipient_email: updated.requested_by_email, project_id: projectId, category: "info",
        title: `${statusLabels[updated.status]} — ${updated.title}`,
        message: decisionNote || undefined,
        link: `/op-management/projets/${projectId}/suivi-controle/approbations`,
      });
    }
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Approbation — ${updated.title}`, from_status: "pending", to_status: updated.status, note: decisionNote || undefined });
    setDeciding(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Workflows d&apos;approbation</h2><button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle demande</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{entityLabels[row.entity_type]}{row.entity_label ? ` · ${row.entity_label}` : ""}{row.approver_name ? ` · Approbateur : ${row.approver_name}` : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        {row.description && <p className="mt-2 text-sm text-slate-600">{row.description}</p>}
        {row.decision_note && <p className="mt-2 text-sm text-slate-600"><b>Decision :</b> {row.decision_note}</p>}
        {row.status === "pending" && <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => startDecision(row, "approved")} className="btn-primary px-3 py-1.5 text-xs">Approuver</button>
          <button onClick={() => startDecision(row, "rejected")} className="btn-secondary px-3 py-1.5 text-xs">Rejeter</button>
        </div>}
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune demande d&apos;approbation.</p>}
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitCreate} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">Nouvelle demande d&apos;approbation</h2><button type="button" onClick={() => setCreating(false)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Titre<input name="title" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Type d&apos;entite<select name="entity_type" className="admin-input">{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Reference (ex : v2, titre du livrable...)<input name="entity_label" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Demandeur<input name="requested_by_name" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Email du demandeur<input name="requested_by_email" type="email" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Approbateur<input name="approver_name" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Email de l&apos;approbateur<input name="approver_email" type="email" className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Envoyer la demande"}</button></div>
        </div>
      </form>
    </div>}

    {deciding && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitDecision} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{deciding.status === "approved" ? "Approuver" : "Rejeter"} — {deciding.row.title}</h2><button type="button" onClick={() => setDeciding(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Decide par<input name="decided_by_name" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Note de decision<textarea name="decision_note" rows={3} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setDeciding(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Confirmer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
