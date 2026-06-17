"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = Record<string, any>;

export default function DietitianManager({ initial }: { initial: Profile[] }) {
  const [rows, setRows] = useState(initial), [editing, setEditing] = useState<Profile | null>(null), [message, setMessage] = useState("");
  async function save() {
    if (!editing) return;
    const updates = {
      status: editing.status,
      short_bio: editing.short_bio,
      availability: editing.availability,
      rate: editing.rate,
      booking_url: editing.booking_url,
      internal_quality_score: editing.internal_quality_score,
      specialties: editing.specialties,
      languages: editing.languages,
      payout_method: editing.payout_method,
      payout_account_name: editing.payout_account_name,
      payout_account_number: editing.payout_account_number,
      payout_bank_name: editing.payout_bank_name,
      payout_mobile_money_operator: editing.payout_mobile_money_operator,
      payout_mobile_money_phone: editing.payout_mobile_money_phone,
      payout_notes: editing.payout_notes,
    };
    const { error } = await createClient().from("dietitian_profiles").update(updates).eq("id", editing.id);
    if (error) setMessage(error.message);
    else {
      setRows(rows.map(r => r.id === editing.id ? editing : r));
      setMessage("Profil partenaire enregistre.");
      setEditing(null);
    }
  }
  return <div><p className="mb-5 rounded-xl bg-mint p-4 text-sm text-forest">Les profils sont crees automatiquement lorsqu'une candidature passe au statut integre au reseau. Completez ici le compte de paiement avant les versements.</p>{message && <p className="mb-5 font-bold text-leaf">{message}</p>}<div className="grid gap-5 md:grid-cols-2">{rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-6"><div className="flex justify-between"><div><h2 className="text-xl font-black">{row.full_name}</h2><p className="mt-1 text-sm text-slate-500">{row.specialties?.join(", ")}</p><p className="mt-1 text-xs text-slate-400">Paiement : {row.payout_method || "non renseigne"}</p></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${row.status === "active" ? "bg-mint text-leaf" : "bg-slate-100"}`}>{row.status}</span></div><p className="mt-4 text-sm">{row.short_bio || "Bio a completer"}</p><button onClick={() => setEditing(row)} className="btn-secondary mt-5 px-4 py-2">Modifier</button></article>)}{!rows.length && <p className="rounded-2xl bg-white p-8 text-slate-400">Aucun partenaire integre.</p>}</div>{editing && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4"><div className="mx-auto my-8 max-w-3xl rounded-3xl bg-white p-7"><div className="flex justify-between"><h2 className="text-2xl font-black">{editing.full_name}</h2><button onClick={() => setEditing(null)} className="text-3xl">x</button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Statut<select className="admin-input" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}><option value="active">Actif</option><option value="inactive">Inactif</option></select></label><label className="grid gap-2 text-sm font-bold">Tarif<input type="number" className="admin-input" value={editing.rate || ""} onChange={e => setEditing({ ...editing, rate: Number(e.target.value) })} /></label><label className="grid gap-2 text-sm font-bold md:col-span-2">Bio courte<textarea className="admin-input" rows={4} value={editing.short_bio || ""} onChange={e => setEditing({ ...editing, short_bio: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Disponibilites<input className="admin-input" value={editing.availability || ""} onChange={e => setEditing({ ...editing, availability: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Lien de reservation<input type="url" className="admin-input" value={editing.booking_url || ""} onChange={e => setEditing({ ...editing, booking_url: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Specialites<input className="admin-input" value={(editing.specialties || []).join(", ")} onChange={e => setEditing({ ...editing, specialties: e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean) })} /></label><label className="grid gap-2 text-sm font-bold">Langues<input className="admin-input" value={(editing.languages || []).join(", ")} onChange={e => setEditing({ ...editing, languages: e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean) })} /></label><label className="grid gap-2 text-sm font-bold">Note qualite interne (%)<input type="number" min="0" max="100" className="admin-input" value={editing.internal_quality_score || ""} onChange={e => setEditing({ ...editing, internal_quality_score: Number(e.target.value) })} /></label><div className="md:col-span-2 mt-2 border-t pt-4"><h3 className="font-black">Compte de paiement prestataire</h3></div><label className="grid gap-2 text-sm font-bold">Canal prefere<select className="admin-input" value={editing.payout_method || ""} onChange={e => setEditing({ ...editing, payout_method: e.target.value })}><option value="">A renseigner</option><option value="mobile_money">Mobile money</option><option value="bank_transfer">Virement bancaire</option><option value="flutterwave">Flutterwave</option><option value="stripe">Stripe</option></select></label><label className="grid gap-2 text-sm font-bold">Nom du titulaire<input className="admin-input" value={editing.payout_account_name || ""} onChange={e => setEditing({ ...editing, payout_account_name: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Numero compte / ID<input className="admin-input" value={editing.payout_account_number || ""} onChange={e => setEditing({ ...editing, payout_account_number: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Banque<input className="admin-input" value={editing.payout_bank_name || ""} onChange={e => setEditing({ ...editing, payout_bank_name: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Operateur mobile money<input className="admin-input" value={editing.payout_mobile_money_operator || ""} onChange={e => setEditing({ ...editing, payout_mobile_money_operator: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Telephone mobile money<input className="admin-input" value={editing.payout_mobile_money_phone || ""} onChange={e => setEditing({ ...editing, payout_mobile_money_phone: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold md:col-span-2">Notes paiement<textarea className="admin-input" rows={3} value={editing.payout_notes || ""} onChange={e => setEditing({ ...editing, payout_notes: e.target.value })} /></label></div><button onClick={save} className="btn-primary mt-6">Enregistrer</button></div></div>}</div>;
}

