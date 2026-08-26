"use client";

import { useMemo, useState } from "react";
import AcceptConsultationButton from "@/components/appointments/AcceptConsultationButton";
import { createClient } from "@/lib/supabase/client";

// Mirrors components/partner/PartnerWaitingRoom.tsx's table/search UI. Unlike the dietitian side
// (consultation_waiting_room is a shared broadcast queue multiple partners can see), a médecin
// request already lands directly against this specialist as a medical_consultations row with
// status:'requested' — so this simply filters that table, no separate waiting-room table needed.
type Row = Record<string, any>;
const date = (value?: string) => value ? new Date(value).toLocaleString("fr-FR") : "—";

export default function MedicalWaitingRoom({ initial, unassigned = [], specialistId }: { initial: Row[]; unassigned?: Row[]; specialistId?: string }) {
  const [rows] = useState(initial);
  const [pending, setPending] = useState(unassigned);
  const [query, setQuery] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);

  async function claim(row: Row) {
    if (!specialistId) return;
    setClaiming(row.id);
    const { error } = await createClient().from("medical_consultations")
      .update({ specialist_id: specialistId, status: "scheduled" })
      .eq("id", row.id).eq("status", "pending_assignment").is("specialist_id", null);
    setClaiming(null);
    if (!error) setPending(current => current.filter(item => item.id !== row.id));
  }
  const filtered = useMemo(() => rows.filter(row => {
    const profile = row.client_profiles || {};
    const haystack = [row.consultation_code, profile.full_name, profile.email, row.chief_complaint].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [rows, query]);

  return <section className="grid gap-4">
    {!!pending.length && <div className="grid gap-3 rounded-2xl border border-orange/40 bg-orange/5 p-4">
      <h2 className="text-sm font-black uppercase text-orange">Clients non assignes (achetes via la facturation Maximus)</h2>
      <div className="grid gap-2">
        {pending.map(row => { const profile = row.client_profiles || {}; return <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
          <div><b>{profile.full_name || profile.email || "Patient"}</b>{row.chief_complaint && <span className="ml-2 text-sm text-slate-500">— {row.chief_complaint}</span>}</div>
          <button onClick={() => claim(row)} disabled={claiming === row.id} className="btn-primary px-4 py-2 text-xs">{claiming === row.id ? "Prise en charge..." : "Prendre en charge"}</button>
        </div>; })}
      </div>
    </div>}
    <div className="rounded-2xl border bg-white p-4">
      <input value={query} onChange={event => setQuery(event.target.value)} className="admin-input" placeholder="Rechercher un patient, un motif…" />
    </div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["ID demande", "Date", "Patient", "Motif / plainte", "Creneau demande", "Mode", "Actions"].map(heading => <th key={heading} className="p-4">{heading}</th>)}</tr></thead>
        <tbody className="divide-y">
          {filtered.map(row => { const profile = row.client_profiles || {}; return <tr key={row.id}>
            <td className="p-4 font-black text-forest">{row.consultation_code || row.id.slice(0, 10).toUpperCase()}</td>
            <td className="p-4">{date(row.created_at)}</td>
            <td className="p-4 font-bold">{profile.full_name || profile.email || "Patient"}</td>
            <td className="max-w-[280px] p-4">{row.chief_complaint || "—"}</td>
            <td className="p-4">{date(row.requested_start || row.scheduled_at)}</td>
            <td className="p-4">{row.consultation_mode || "video"}</td>
            <td className="p-4"><AcceptConsultationButton requestId={row.id} requestType="medical" requestedStart={row.requested_start || row.scheduled_at} /></td>
          </tr>; })}
          {!filtered.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">Aucune demande en attente.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
