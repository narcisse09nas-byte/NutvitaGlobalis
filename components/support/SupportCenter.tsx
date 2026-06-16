"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function SupportCenter({ initialTickets = [], userId }: { initialTickets?: Row[]; userId?: string }) {
  const [tickets, setTickets] = useState(initialTickets), [selected, setSelected] = useState<Row | null>(initialTickets[0] || null), [message, setMessage] = useState("");
  async function createTicket(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, payload = Object.fromEntries(new FormData(form));
    const { data, error } = await createClient().from("support_tickets").insert({ ...payload, requester_id: userId || null }).select().single();
    if (error) setMessage(error.message); else { setTickets([data, ...tickets]); setSelected(data); form.reset(); setMessage("Ticket cree."); }
  }
  return <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]"><section className="space-y-6"><div className="rounded-2xl border bg-white p-6"><h2 className="text-2xl font-black">FAQ</h2><div className="mt-4 space-y-4">{[["Comment activer un service ?", "Creez votre compte, choisissez le service, puis finalisez le paiement quand les moyens seront actives."], ["Comment contacter NutVitaGlobalis ?", "Utilisez le formulaire, WhatsApp, email ou un ticket support."], ["Mes donnees sont-elles protegees ?", "Les acces sont controles par role et les actions sensibles sont journalisees."]].map(([q, a]) => <div key={q}><b>{q}</b><p className="mt-1 text-sm text-slate-500">{a}</p></div>)}</div></div><form onSubmit={createTicket} className="grid gap-4 rounded-2xl border bg-white p-6"><h2 className="text-2xl font-black">Creer un ticket</h2><input name="requester_name" className="admin-input" placeholder="Nom complet" /><input name="requester_email" type="email" className="admin-input" placeholder="Email" /><select name="category" className="admin-input"><option value="general">Question generale</option><option value="payment">Paiement</option><option value="health">Suivi sante</option><option value="technical">Technique</option></select><input name="subject" required className="admin-input" placeholder="Sujet" /><button className="btn-primary justify-self-start">Envoyer</button>{message && <p className="font-bold text-leaf">{message}</p>}</form></section><section className="rounded-2xl border bg-white p-6"><h2 className="text-2xl font-black">Suivi des tickets</h2><div className="mt-4 grid gap-3">{tickets.map(ticket => <button key={ticket.id} onClick={() => setSelected(ticket)} className={`rounded-xl p-4 text-left ${selected?.id === ticket.id ? "bg-mint" : "bg-slate-50"}`}><b>{ticket.subject}</b><p className="text-sm text-slate-500">{ticket.status} - {ticket.category}</p></button>)}{!tickets.length && <p className="text-slate-400">Connectez-vous pour suivre vos tickets ou creez une nouvelle demande.</p>}</div>{selected && <div className="mt-6 rounded-xl bg-slate-50 p-4"><h3 className="font-black">{selected.subject}</h3><p className="mt-2 text-sm text-slate-600">Statut : {selected.status}</p></div>}</section></div>;
}
