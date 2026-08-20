"use client";

import { useMemo, useState } from "react";
import AcceptConsultationButton from "@/components/appointments/AcceptConsultationButton";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;
const date = (value?: string) => value ? new Date(value).toLocaleString("fr-FR") : "—";
const statusLabels: Record<string, string> = {
  waiting: "En attente",
  partner_interested: "Intérêt manifesté",
  assigned_pending_partner: "À confirmer",
  accepted_pending_payment: "Paiement attendu",
  active: "Active",
};

export default function PartnerWaitingRoom({ initial, partnerId }: { initial: Row[]; partnerId: string }) {
  const [rows] = useState(initial);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [history, setHistory] = useState<Row[] | null>(null);
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => rows.filter((row) => {
    const profile = row.client_profiles || {};
    const haystack = [row.request_code, profile.full_name, profile.city, profile.state_region, profile.country, row.reason, row.status].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (status === "all" || row.status === status);
  }), [rows, query, status]);

  async function showHistory(row: Row) {
    const { data, error } = await createClient().from("consultation_assignment_history").select("*").eq("request_id", row.id).order("created_at", { ascending: false });
    if (error) setMessage(error.message); else setHistory(data || []);
  }

  return <section className="grid gap-4">
    <div className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_240px]">
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="admin-input" placeholder="Rechercher un client, une ville, un motif…" />
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="admin-input"><option value="all">Tous les statuts</option><option value="waiting">En attente</option><option value="assigned_pending_partner">À confirmer</option><option value="accepted_pending_payment">Paiement attendu</option><option value="active">Active</option></select>
    </div>
    {message ? <p className="rounded-xl bg-mint p-3 text-sm font-bold text-leaf">{message}</p> : null}
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[1600px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["ID demande", "Date", "Client", "Sexe", "Ville", "État / région", "Pays", "Motif / plaintes", "Créneau demandé", "Statut", "Nutritionniste traitant", "Actions"].map((heading) => <th key={heading} className="p-4">{heading}</th>)}</tr></thead><tbody className="divide-y">{filtered.map((row) => {
      const profile = row.client_profiles || {};
      const mine = row.selected_partner_id === partnerId;
      const available = !row.selected_partner_id || mine;
      return <tr key={row.id}>
        <td className="p-4 font-black text-forest">{row.request_code || row.id.slice(0, 10).toUpperCase()}</td><td className="p-4">{date(row.created_at)}</td><td className="p-4 font-bold">{profile.full_name || "Client"}</td><td className="p-4">{profile.sex || "—"}</td><td className="p-4">{profile.city || "—"}</td><td className="p-4">{profile.state_region || "—"}</td><td className="p-4">{profile.country || "—"}</td><td className="max-w-[280px] p-4">{row.reason || profile.complaints || "—"}</td><td className="p-4">{date(row.requested_start)}</td><td className="p-4"><span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-leaf">{statusLabels[row.status] || row.status}</span></td><td className="p-4">{row.selected_partner?.full_name || (mine ? "Vous" : "Non attribué")}</td><td className="p-4"><div className="flex gap-2">{available && !["accepted_pending_payment", "active"].includes(row.status) ? <AcceptConsultationButton requestId={row.id} requestType="dietetic" requestedStart={row.requested_start} /> : null}<button onClick={() => showHistory(row)} className="btn-secondary px-3 py-2">Historique</button></div></td>
      </tr>;
    })}{!filtered.length ? <tr><td colSpan={12} className="p-10 text-center text-slate-400">Aucune demande ne correspond aux filtres.</td></tr> : null}</tbody></table></div>
    {history ? <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/60 p-4"><section className="mx-auto my-12 max-w-3xl rounded-3xl bg-white p-6"><div className="flex justify-between"><h2 className="text-xl font-black">Historique des attributions</h2><button onClick={() => setHistory(null)} className="text-2xl">×</button></div><div className="mt-5 grid gap-3">{history.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-4"><b>{item.action}</b><p className="text-sm text-slate-500">{date(item.created_at)}</p></div>)}{!history.length ? <p>Aucun historique disponible.</p> : null}</div></section></div> : null}
  </section>;
}
