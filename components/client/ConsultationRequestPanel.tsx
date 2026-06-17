"use client";

import {useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Row=Record<string,any>;

export default function ConsultationRequestPanel({clientId,profile,bookings,premiumSubscriptions,requests}:{clientId:string;profile:Row|null;bookings:Row[];premiumSubscriptions:Row[];requests:Row[]}){
  const [message,setMessage]=useState("");
  const [reason,setReason]=useState("");
  const [rows,setRows]=useState(requests);
  const activeBooking=bookings[0];
  const hasPremium=premiumSubscriptions.length>0;
  const canRequest=Boolean(activeBooking||hasPremium);

  async function requestConsultation(){
    if(!canRequest){
      setMessage("Vous devez avoir un pack actif ou un service premium actif pour solliciter une consultation.");
      return;
    }
    setMessage("Envoi de la demande...");
    const assignedPartner=profile?.assigned_partner_id;
    const payload={
      client_id:clientId,
      teleconseil_id:activeBooking?.teleconseil_id||null,
      payment_id:activeBooking?.payment_id||null,
      reason:reason||"Demande de consultation depuis l'espace client",
      status:assignedPartner?"assigned_pending_partner":"waiting",
      selected_partner_id:assignedPartner||null,
      preferred_language:profile?.preferred_language||"fr",
      country:profile?.country||null,
      city:profile?.city||null,
    };
    const {data,error}=await createClient().from("consultation_waiting_room").insert(payload).select("*").single();
    if(error){
      setMessage(error.message);
      return;
    }
    setRows([data,...rows]);
    setReason("");
    setMessage(assignedPartner?"Demande envoyee au teleconseiller affecte.":"Demande envoyee en salle d'attente NutVitaGlobalis.");
  }

  return <div className="grid gap-6">
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">Solliciter une consultation</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{activeBooking?"Votre pack actif permet de solliciter votre teleconseiller.":hasPremium?"Votre service premium actif permet de demander une consultation; NutVitaGlobalis orientera la demande vers un teleconseiller.":"Aucun pack ou service premium actif n'est disponible pour le moment."}</p>
      <label className="mt-5 grid gap-2 text-sm font-bold">Motif de la demande
        <textarea className="admin-input min-h-28" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Expliquez brievement votre besoin, vos disponibilites ou votre objectif."/>
      </label>
      <button onClick={requestConsultation} disabled={!canRequest} className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50">Envoyer la demande</button>
      {message&&<p className="mt-4 rounded-xl bg-mint p-4 text-sm font-bold text-forest">{message}</p>}
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">Mes demandes</h2>
      <div className="mt-4 grid gap-3">{rows.map(row=><article key={row.id} className="rounded-xl bg-slate-50 p-4">
        <b>{row.reason||"Consultation"}</b>
        <p className="mt-1 text-sm text-slate-500">Statut : {row.status} - {new Date(row.created_at).toLocaleString("fr-FR")}</p>
      </article>)}
      {!rows.length&&<p className="text-slate-400">Aucune demande de consultation.</p>}</div>
    </section>
  </div>;
}
