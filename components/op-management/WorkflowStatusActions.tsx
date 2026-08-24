"use client";
// Refinement program, Wave 1: one shared status-pill + decision-modal pair for the
// draft -> submitted -> verified -> approved/validated (+ returned/rejected) pattern that
// Achievements, Expenses, MEAL entries, Deliverables, NCRs and Change Requests each currently
// hand-roll slightly differently. The component only owns the UI flow (pick next status, collect
// an optional reviewer name + note, confirm) — the actual write (status update, ppm_history insert,
// notifyPpmEvent call, any domain cascade) stays with the caller via onConfirm, since that differs
// per entity.
import { useState, type FormEvent } from "react";

export type WorkflowAction = {
  value: string;
  label: string;
  tone?: "primary" | "danger" | "ghost";
  requireNote?: boolean;
};

export type WorkflowHistoryEntry = {
  status: string;
  at: string;
  byName?: string | null;
  note?: string | null;
};

export default function WorkflowStatusActions({
  entityLabel, itemTitle, status, statusLabels, statusTones, actions, onConfirm, history, collectReviewerName = true,
}: {
  entityLabel: string;
  itemTitle: string;
  status: string;
  statusLabels: Record<string, string>;
  statusTones: Record<string, string>;
  actions: WorkflowAction[];
  onConfirm: (input: { nextStatus: string; reviewedByName: string | null; note: string | null }) => Promise<{ error?: string } | void>;
  history?: WorkflowHistoryEntry[];
  collectReviewerName?: boolean;
}) {
  const [deciding, setDeciding] = useState<WorkflowAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deciding) return;
    const form = new FormData(event.currentTarget);
    const reviewedByName = String(form.get("reviewed_by_name") || "").trim() || null;
    const note = String(form.get("note") || "").trim() || null;
    if (deciding.requireNote && !note) { setMessage("Un commentaire est obligatoire pour cette action."); return; }
    setSaving(true);
    setMessage("");
    const result = await onConfirm({ nextStatus: deciding.value, reviewedByName, note });
    setSaving(false);
    if (result?.error) { setMessage(result.error); return; }
    setDeciding(null);
  }

  return <div className="grid gap-2">
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[status] || "bg-slate-100 text-slate-600"}`}>{statusLabels[status] || status}</span>
      {!!history?.length && <button type="button" onClick={() => setShowHistory(current => !current)} className="text-xs font-bold text-slate-400 underline">
        {showHistory ? "Masquer l'historique" : "Voir l'historique"}
      </button>}
    </div>

    {showHistory && !!history?.length && <ul className="grid gap-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
      {history.map((entry, index) => <li key={index}>
        <b className={`font-bold ${statusTones[entry.status] ? "" : "text-slate-600"}`}>{statusLabels[entry.status] || entry.status}</b>
        {" — "}{new Date(entry.at).toLocaleString("fr-FR")}{entry.byName ? ` · ${entry.byName}` : ""}
        {entry.note && <span className="block italic">{entry.note}</span>}
      </li>)}
    </ul>}

    <div className="flex flex-wrap gap-2">
      {actions.map(action => <button
        key={action.value}
        type="button"
        onClick={() => { setMessage(""); setDeciding(action); }}
        className={action.tone === "primary" ? "btn-primary px-3 py-1.5 text-xs" : action.tone === "danger" ? "rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600" : "btn-secondary px-3 py-1.5 text-xs"}
      >{action.label}</button>)}
    </div>

    {deciding && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-black text-forest">{deciding.label} — {entityLabel} : {itemTitle}</h2>
          <button type="button" onClick={() => setDeciding(null)} className="text-2xl" aria-label="Fermer">×</button>
        </div>
        <div className="mt-5 grid gap-4">
          {collectReviewerName && <label className="grid gap-2 text-sm font-bold">Revu par<input name="reviewed_by_name" className="admin-input" /></label>}
          <label className="grid gap-2 text-sm font-bold">Commentaire{deciding.requireNote ? " (obligatoire)" : ""}<textarea name="note" rows={3} required={deciding.requireNote} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDeciding(null)} className="btn-secondary">Annuler</button>
            <button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Confirmer"}</button>
          </div>
        </div>
      </form>
    </div>}
  </div>;
}
