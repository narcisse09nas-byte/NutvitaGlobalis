"use client";

import {useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Row=Record<string,any>;

export default function ConsultationRequestPanel({clientId,profile,bookings,premiumSubscriptions,requests}:{clientId:string;profile:Row|null;bookings:Row[];premiumSubscriptions:Row[];requests:Row[]}){
  const en=profile?.preferred_language==="en",tx=(fr:string,english:string)=>en?english:fr;
  const [message,setMessage]=useState("");
  const [reason,setReason]=useState("");
  const [rows,setRows]=useState(requests);
  const activeBooking=bookings[0];
  const hasPremium=premiumSubscriptions.length>0;
  const canRequest=Boolean(activeBooking||hasPremium);

  async function requestConsultation(){
    if(!canRequest){
      setMessage(tx("Vous devez avoir un pack actif ou un service premium actif pour solliciter une consultation.","You need an active pack or premium service to request a consultation."));
      return;
    }
    setMessage(tx("Envoi de la demande...","Sending request..."));
    const assignedPartner=profile?.assigned_partner_id;
    const payload={
      client_id:clientId,
      teleconseil_id:activeBooking?.teleconseil_id||null,
      payment_id:activeBooking?.payment_id||null,
      reason:reason||tx("Demande de consultation depuis l'espace client","Consultation request from the client area"),
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
    setMessage(assignedPartner?tx("Demande envoyee au teleconseiller affecte.","Request sent to your assigned adviser."):tx("Demande envoyee en salle d'attente NutVitaGlobalis.","Request sent to the NutVitaGlobalis waiting room."));
  }

  return <div className="grid gap-6">
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">{tx("Solliciter une consultation","Request a consultation")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{activeBooking?tx("Votre pack actif permet de solliciter votre teleconseiller.","Your active pack allows you to contact your adviser."):hasPremium?tx("Votre service premium actif permet de demander une consultation; NutVitaGlobalis orientera la demande vers un teleconseiller.","Your active premium service allows a consultation request; NutVitaGlobalis will route it to an adviser."):tx("Aucun pack ou service premium actif n'est disponible pour le moment.","No active pack or premium service is currently available.")}</p>
      <label className="mt-5 grid gap-2 text-sm font-bold">{tx("Motif de la demande","Reason for request")}
        <textarea className="admin-input min-h-28" value={reason} onChange={e=>setReason(e.target.value)} placeholder={tx("Expliquez brievement votre besoin, vos disponibilites ou votre objectif.","Briefly describe your need, availability or goal.")}/>
      </label>
      <button onClick={requestConsultation} disabled={!canRequest} className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50">{tx("Envoyer la demande","Send request")}</button>
      {message&&<p className="mt-4 rounded-xl bg-mint p-4 text-sm font-bold text-forest">{message}</p>}
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">{tx("Mes demandes","My requests")}</h2>
      <div className="mt-4 grid gap-3">{rows.map(row=><article key={row.id} className="rounded-xl bg-slate-50 p-4">
        <b>{row.reason||tx("Consultation","Consultation")}</b>
        <p className="mt-1 text-sm text-slate-500">{tx("Statut","Status")}: {row.status} - {new Date(row.created_at).toLocaleString(en?"en-GB":"fr-FR")}</p>
      </article>)}
      {!rows.length&&<p className="text-slate-400">{tx("Aucune demande de consultation.","No consultation request.")}</p>}</div>
    </section>
  </div>;
}
