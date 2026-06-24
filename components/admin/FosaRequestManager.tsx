"use client";

import { useState } from "react";

type Row = Record<string, any>;

export default function FosaRequestManager({ initial, canDelete }: { initial: Row[]; canDelete: boolean }) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState("");

  async function decide(row: Row, action: "approve" | "reject") {
    const notes = action === "reject" ? prompt("Motif ou precision a communiquer au demandeur") || "" : prompt("Note administrative facultative") || "";
    const response = await fetch("/api/admin/fosa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, action, notes }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.message); return; }
    setRows(rows.map(item => item.id === row.id ? { ...item, status: action === "approve" ? "approved" : "rejected", admin_notes: notes } : item));
    setMessage(action === "approve" ? "Acces FOSA approuve et immediatement actif." : "Demande rejetee.");
  }

  async function remove(row: Row) {
    const reason = prompt(`Pourquoi supprimer l'espace FOSA « ${row.name} » ?`);
    if (!reason?.trim()) { setMessage("La suppression exige un motif."); return; }
    if (!confirm("Supprimer cet espace FOSA, ses affectations et ses donnees metier ? Le compte client principal sera conserve.")) return;
    const response = await fetch("/api/admin/fosa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, action: "delete", notes: reason.trim() }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.message); return; }
    setRows(rows.filter(item => item.id !== row.id));
    setMessage("Espace FOSA supprime. Le compte NutVitaGlobalis principal et ses autres services sont conserves.");
  }

  return <div className="grid gap-5">
    {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-leaf">{row.status}</p>
          <h2 className="mt-2 text-xl font-black">{row.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{row.contact_name} - {row.contact_email} - {row.contact_phone || "sans telephone"}</p>
          <p className="mt-3 text-sm"><b>{row.requested_facility_count}</b> formation(s) sanitaire(s) et <b>{row.requested_staff_count}</b> compte(s) staff demandes.</p>
          {row.status === "approved" && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Acces actif : aucune autre action de validation n'est attendue.</p>}
          {row.admin_notes && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">{row.admin_notes}</p>}
        </div>
        <div className="flex h-fit flex-wrap gap-2">
          {row.status === "pending" && <><button onClick={() => decide(row, "approve")} className="btn-primary px-4 py-2">Valider</button><button onClick={() => decide(row, "reject")} className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">Rejeter</button></>}
          {canDelete && <button onClick={() => remove(row)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">Supprimer l'espace FOSA</button>}
        </div>
      </div>
    </article>)}
    {!rows.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucune demande FOSA.</p>}
  </div>;
}
