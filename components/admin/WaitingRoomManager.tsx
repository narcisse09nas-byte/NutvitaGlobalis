"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

function scorePartner(request: Row, partner: Row) {
  let score = Number(partner.internal_quality_score || 50);
  const text = `${request.reason || ""}`.toLowerCase();
  for (const specialty of partner.specialties || []) if (text.includes(String(specialty).toLowerCase())) score += 15;
  if (request.country && partner.country && request.country === partner.country) score += 10;
  if (partner.status !== "active") score -= 100;
  return score;
}

export default function WaitingRoomManager({ initial, partners }: { initial: Row[]; partners: Row[] }) {
  const [rows, setRows] = useState(initial), [message, setMessage] = useState("");
  const activePartners = useMemo(() => partners.filter(p => p.status === "active"), [partners]);
  async function assign(row: Row, partnerId: string) {
    if (!partnerId) return;
    const supabase = createClient(), now = new Date().toISOString();
    const { error } = await supabase.from("consultation_waiting_room").update({ selected_partner_id: partnerId, selected_by_admin: null, admin_validated_at: now, status: "assigned_pending_partner" }).eq("id", row.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    await supabase.from("client_profiles").update({ assigned_partner_id: partnerId, partner_assignment_status: "assigned_pending_partner" }).eq("id", row.client_id);
    setRows(rows.map(x => x.id === row.id ? { ...x, selected_partner_id: partnerId, status: "assigned_pending_partner", admin_validated_at: now } : x));
    setMessage("Client attribue. En attente d'endossement par le partenaire.");
  }
  return <div className="grid gap-4">{message && <p className="rounded-xl bg-mint p-4 font-bold text-leaf">{message}</p>}{rows.map(row => { const ranked = [...activePartners].sort((a, b) => scorePartner(row, b) - scorePartner(row, a)); const recommended = ranked[0]; return <article key={row.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-black">{row.client_profiles?.full_name || "Client"}</h2><p className="mt-1 text-sm text-slate-500">{row.reason || "Consultation"} - {[row.city, row.country].filter(Boolean).join(", ") || "Localisation non renseignee"}</p><p className="mt-2 text-xs font-bold text-slate-400">Statut : {row.status}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">IA aide choix : {recommended?.full_name || "aucun partenaire actif"}</span></div><div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><select defaultValue={recommended?.id || ""} onChange={e => assign(row, e.target.value)} className="admin-input"><option value="">Attribuer a...</option>{ranked.map(p => <option key={p.id} value={p.id}>{p.full_name} - score {scorePartner(row, p)}</option>)}</select><button onClick={() => recommended && assign(row, recommended.id)} className="btn-primary px-4 py-2">Attribuer recommande</button></div></article>; })}{!rows.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucune demande en attente.</p>}</div>;
}
