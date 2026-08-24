"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import MedicalConsultationManager from "./MedicalConsultationManager";

// Mirrors components/partner/PartnerConsultationWorkspace.tsx's layout (today's schedule + quick
// actions + completed register).
type Row = Record<string, any>;
const day = (value: string) => new Date(value).toLocaleDateString("fr-FR");
const time = (value: string) => new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function MedicalConsultationWorkspace({ initial, patients, specialistId }: { initial: Row[]; patients: Row[]; specialistId: string }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const today = new Date().toDateString();
  const schedule = rows.filter(x => x.scheduled_at && new Date(x.scheduled_at).toDateString() === today && x.status !== "completed");
  const completed = useMemo(() => rows.filter(x => {
    const dt = new Date(x.completed_at || x.scheduled_at || x.created_at);
    return (!from || dt >= new Date(from)) && (!to || dt <= new Date(`${to}T23:59:59`)) && [x.consultation_code, x.client_profiles?.full_name, x.chief_complaint].join(" ").toLowerCase().includes(query.toLowerCase());
  }), [rows, query, from, to]);

  function handleSaved(row: Row) { setRows(current => [row, ...current]); setOpen(false); }

  return <div className="grid gap-6">
    <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
      <section className="rounded-3xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Programme de la journee</h2><p className="text-sm text-slate-500">{schedule.length} consultation(s)</p></div><button onClick={() => setOpen(true)} className="btn-primary">+ Initier une consultation</button></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Patient</th><th className="p-3">Heure</th><th className="p-3">Motif</th></tr></thead><tbody className="divide-y">{schedule.map(x => <tr key={x.id}><td className="p-3">{x.client_profiles?.full_name || "Patient"}</td><td className="p-3">{x.scheduled_at ? time(x.scheduled_at) : "—"}</td><td className="p-3">{x.chief_complaint || "—"}</td></tr>)}{!schedule.length && <tr><td colSpan={3} className="p-8 text-center text-slate-400">Aucune consultation planifiee aujourd&apos;hui.</td></tr>}</tbody></table></div>
      </section>
      <section className="rounded-3xl bg-forest p-6 text-white"><h2 className="text-xl font-black text-white">Actions rapides</h2><div className="mt-5 grid gap-3"><Link href="/medecin-specialiste/patients" className="rounded-xl bg-white/10 p-4 font-bold hover:bg-white/20">Ouvrir un dossier patient</Link><Link href="/medecin-specialiste/appels" className="rounded-xl bg-white/10 p-4 font-bold hover:bg-white/20">Planifier un appel video</Link><Link href="/medecin-specialiste/salle-attente" className="rounded-xl bg-white/10 p-4 font-bold hover:bg-white/20">Voir la salle d&apos;attente</Link></div></section>
    </div>
    <section className="rounded-3xl border bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-black">Registre des consultations</h2><p className="text-sm text-slate-500">Fiches et documents imprimables.</p></div><div className="flex flex-wrap gap-2"><input value={query} onChange={event => setQuery(event.target.value)} className="admin-input max-w-[260px]" placeholder="Code, patient, motif…" /><input value={from} onChange={event => setFrom(event.target.value)} type="date" className="admin-input w-auto" /><input value={to} onChange={event => setTo(event.target.value)} type="date" className="admin-input w-auto" /></div></div>
      <div className="mt-5 overflow-x-auto rounded-xl border"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["ID consultation", "Patient", "Date", "Motif", "Statut", "Actions"].map(x => <th key={x} className="p-4">{x}</th>)}</tr></thead><tbody className="divide-y">{completed.map(x => <tr key={x.id}><td className="p-4 font-black text-forest">{x.consultation_code}</td><td className="p-4 font-bold">{x.client_profiles?.full_name || "Patient"}</td><td className="p-4">{day(x.completed_at || x.scheduled_at || x.created_at)}</td><td className="p-4">{x.chief_complaint || "—"}</td><td className="p-4">{x.status}</td><td className="p-4"><Link href={`/medecin-specialiste/consultations/${x.id}`} className="btn-secondary px-3 py-2">Fiche / imprimer</Link></td></tr>)}{!completed.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucune consultation ne correspond aux filtres.</td></tr>}</tbody></table></div>
    </section>
    {open && <div className="fixed inset-0 z-[140] overflow-y-auto bg-slate-950/65 p-3"><section className="mx-auto my-5 max-w-4xl rounded-3xl bg-white p-4 sm:p-7"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-2xl font-black">Nouvelle consultation</h2><p className="text-sm text-slate-500">Completez le dossier clinique.</p></div><button onClick={() => setOpen(false)} className="text-3xl">×</button></div><MedicalConsultationManager patients={patients} specialistId={specialistId} onClose={() => setOpen(false)} onSaved={handleSaved} /></section></div>}
  </div>;
}
