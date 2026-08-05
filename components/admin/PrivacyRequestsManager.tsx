"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

const typeLabels: Record<string, string> = {
  export: "Export des données",
  delete: "Suppression du compte",
  rectification: "Rectification",
  consent_update: "Mise à jour des consentements",
  restriction: "Limitation du traitement",
};

const statusLabels: Record<string, string> = {
  open: "Ouverte",
  in_progress: "En cours",
  completed: "Traitée",
  rejected: "Refusée",
  cancelled: "Annulée",
};

const statusTone: Record<string, string> = {
  open: "bg-orange/15 text-orange",
  in_progress: "bg-sky-500/15 text-sky-700",
  completed: "bg-emerald-500/15 text-emerald-700",
  rejected: "bg-rose-500/15 text-rose-700",
  cancelled: "bg-slate-300/40 text-slate-500",
};

export default function PrivacyRequestsManager({ requests, clients }: { requests: Row[]; clients: Row[] }) {
  const [rows, setRows] = useState<Row[]>(requests);
  const [drafts, setDrafts] = useState<Record<string, { status: string; response: string }>>({});
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<string>("open");

  const clientById = useMemo(() => new Map(clients.map(client => [client.id, client])), [clients]);
  const visible = useMemo(() => rows
    .filter(row => filter === "all" || row.status === filter)
    .sort((a, b) => +new Date(b.requested_at || 0) - +new Date(a.requested_at || 0)), [rows, filter]);

  function draftFor(row: Row) {
    return drafts[row.id] || { status: row.status, response: row.response || "" };
  }

  function updateDraft(id: string, patch: Partial<{ status: string; response: string }>) {
    setDrafts(current => ({ ...current, [id]: { ...draftFor(rows.find(row => row.id === id)!), ...current[id], ...patch } }));
  }

  async function save(row: Row) {
    setMessage("");
    const draft = draftFor(row);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const completed = draft.status === "completed" || draft.status === "rejected" || draft.status === "cancelled";
    const payload = {
      status: draft.status,
      response: draft.response || null,
      handled_by: user?.id || null,
      completed_at: completed ? new Date().toISOString() : null,
    };
    const { data, error } = await supabase.from("privacy_requests").update(payload).eq("id", row.id).select("*").single();
    if (error) { setMessage(error.message); return; }
    setRows(current => current.map(item => item.id === row.id ? data : item));
    setDrafts(current => { const next = { ...current }; delete next[row.id]; return next; });
    setMessage("Demande mise à jour.");
  }

  return <div className="grid gap-6">
    <section className="rounded-2xl border bg-amber-50 p-5 text-sm leading-6 text-amber-900">
      <b>Rappel :</b> valider une demande ici met à jour son statut et la réponse visible par le client, mais n&apos;efface ni n&apos;anonymise rien automatiquement. Pour une demande de suppression, effectuez l&apos;action réelle (suppression ou anonymisation des données concernées) dans Supabase en tenant compte des obligations légales, comptables et de preuve, puis marquez la demande comme traitée.
    </section>

    <section className="flex flex-wrap items-center gap-2">
      {["open", "in_progress", "completed", "rejected", "cancelled", "all"].map(key => (
        <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === key ? "bg-forest text-white" : "bg-slate-100 text-slate-600"}`}>
          {key === "all" ? "Toutes" : statusLabels[key]}
        </button>
      ))}
    </section>

    {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}

    <section className="grid gap-4">
      {visible.map(row => {
        const client = clientById.get(row.user_id);
        const draft = draftFor(row);
        return <article key={row.id} className="rounded-2xl border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{typeLabels[row.request_type] || row.request_type}</p>
              <h3 className="mt-1 text-lg font-black">{client?.full_name || "Client inconnu"}</h3>
              <p className="text-sm text-slate-500">{client?.email || row.user_id}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[row.status] || "bg-slate-100 text-slate-600"}`}>{statusLabels[row.status] || row.status}</span>
          </div>
          {row.details && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{row.details}</p>}
          <p className="mt-2 text-xs text-slate-400">Demandée le {new Date(row.requested_at).toLocaleString("fr-FR")}{row.completed_at ? ` · Traitée le ${new Date(row.completed_at).toLocaleString("fr-FR")}` : ""}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
            <label className="grid gap-1 text-sm font-bold">Statut
              <select value={draft.status} onChange={event => updateDraft(row.id, { status: event.target.value })} className="admin-input">
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">Réponse visible par le client
              <textarea value={draft.response} onChange={event => updateDraft(row.id, { response: event.target.value })} rows={2} className="admin-input" placeholder="Ex. : Vos données ont été supprimées, à l'exception des factures conservées 10 ans pour obligation comptable." />
            </label>
          </div>
          <button onClick={() => save(row)} className="btn-primary mt-4">Enregistrer</button>
        </article>;
      })}
      {!visible.length && <p className="text-slate-400">Aucune demande dans ce filtre.</p>}
    </section>
  </div>;
}
