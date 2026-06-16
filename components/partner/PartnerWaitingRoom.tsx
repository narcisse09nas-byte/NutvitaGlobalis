"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function PartnerWaitingRoom({ initial, partnerId }: { initial: Row[]; partnerId: string }) {
  const [rows, setRows] = useState(initial), [message, setMessage] = useState("");
  async function interest(row: Row) {
    const { error } = await createClient().from("consultation_waiting_room_interests").upsert({ request_id: row.id, partner_id: partnerId, status: "pending" }, { onConflict: "request_id,partner_id" });
    if (error) setMessage(error.message); else setMessage("Votre interet est transmis a l'administration.");
  }
  async function endorse(row: Row) {
    const { error } = await createClient().from("consultation_waiting_room").update({ status: "active", partner_endorsed_at: new Date().toISOString() }).eq("id", row.id);
    if (error) setMessage(error.message); else setRows(rows.map(x => x.id === row.id ? { ...x, status: "active", partner_endorsed_at: new Date().toISOString() } : x));
  }
  return <div className="grid gap-4">{message && <p className="rounded-xl bg-mint p-4 font-bold text-leaf">{message}</p>}{rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-black">{row.client_profiles?.full_name || "Client en attente"}</h2><p className="mt-1 text-sm text-slate-500">{row.reason || "Consultation"} - {[row.city, row.country].filter(Boolean).join(", ") || "Localisation non renseignee"}</p><p className="mt-2 text-xs font-bold text-slate-400">Statut : {row.status}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{new Date(row.created_at).toLocaleDateString("fr-FR")}</span></div><div className="mt-4 flex flex-wrap gap-3">{row.selected_partner_id === partnerId && row.status === "assigned_pending_partner" ? <button onClick={() => endorse(row)} className="btn-primary px-4 py-2">Endosser l'attribution</button> : <button onClick={() => interest(row)} className="btn-secondary px-4 py-2">Je souhaite prendre ce client</button>}</div></article>)}{!rows.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucun client en salle d'attente.</p>}</div>;
}
