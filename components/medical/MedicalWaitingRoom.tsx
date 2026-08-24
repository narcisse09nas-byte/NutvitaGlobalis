"use client";

import { useMemo, useState } from "react";
import AcceptConsultationButton from "@/components/appointments/AcceptConsultationButton";

// Mirrors components/partner/PartnerWaitingRoom.tsx's table/search UI. Unlike the dietitian side
// (consultation_waiting_room is a shared broadcast queue multiple partners can see), a médecin
// request already lands directly against this specialist as a medical_consultations row with
// status:'requested' — so this simply filters that table, no separate waiting-room table needed.
type Row = Record<string, any>;
const date = (value?: string) => value ? new Date(value).toLocaleString("fr-FR") : "—";

export default function MedicalWaitingRoom({ initial }: { initial: Row[] }) {
  const [rows] = useState(initial);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => rows.filter(row => {
    const profile = row.client_profiles || {};
    const haystack = [row.consultation_code, profile.full_name, profile.email, row.chief_complaint].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [rows, query]);

  return <section className="grid gap-4">
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
