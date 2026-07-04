"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function AppointmentBooking({ dietitians, userId,locale="fr" }: { dietitians: Row[]; userId?: string;locale?:"fr"|"en" }) {
  const en=locale==="en",tx=(fr:string,english:string)=>en?english:fr;
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) { setMessage(tx("Connectez-vous comme client pour confirmer le rendez-vous.","Sign in as a client to confirm the appointment.")); return; }
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    const { error } = await createClient().from("appointments").insert({ client_id: userId, dietitian_id: payload.dietitian_id || null, appointment_type: payload.appointment_type, scheduled_at: payload.scheduled_at ? new Date(String(payload.scheduled_at)).toISOString() : null, timezone: payload.timezone || "Africa/Douala", reason: payload.reason, status: "pending", created_by: userId });
    setMessage(error ? error.message : tx("Rendez-vous demande. Une confirmation automatique sera envoyee des que le creneau est valide.","Appointment requested. An automatic confirmation will be sent once the time slot is validated."));
    if (!error) e.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><label className="grid gap-2 text-sm font-bold">{tx("Dieteticien","Dietitian")}<select name="dietitian_id" className="admin-input"><option value="">{tx("Premier disponible","First available")}</option>{dietitians.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">{tx("Type","Type")}<select name="appointment_type" className="admin-input"><option value="teleconsultation">{tx("Teleconsultation","Teleconsultation")}</option><option value="onsite">{tx("Sur site","On-site")}</option><option value="follow_up">{tx("Suivi","Follow-up")}</option><option value="child_growth">{tx("Croissance enfant","Child growth")}</option><option value="health_review">{tx("Bilan sante","Health review")}</option></select></label><label className="grid gap-2 text-sm font-bold">{tx("Creneau","Time slot")}<input name="scheduled_at" type="datetime-local" required className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">{tx("Fuseau horaire","Time zone")}<select name="timezone" className="admin-input"><option value="Africa/Douala">Africa/Douala</option><option value="Africa/Lagos">Africa/Lagos</option><option value="Europe/Paris">Europe/Paris</option><option value="America/Toronto">America/Toronto</option></select></label><label className="grid gap-2 text-sm font-bold md:col-span-2">{tx("Motif","Reason")}<textarea name="reason" rows={4} className="admin-input" /></label><button className="btn-primary justify-self-start md:col-span-2">{tx("Demander le rendez-vous","Request appointment")}</button>{message && <p className="font-bold text-leaf md:col-span-2">{message}</p>}</form>;
}
