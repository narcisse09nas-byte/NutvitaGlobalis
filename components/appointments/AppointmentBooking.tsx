"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

export default function AppointmentBooking({ dietitians, userId }: { dietitians: Row[]; userId?: string }) {
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) { setMessage("Connectez-vous comme client pour confirmer le rendez-vous."); return; }
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    const { error } = await createClient().from("appointments").insert({ client_id: userId, dietitian_id: payload.dietitian_id || null, appointment_type: payload.appointment_type, scheduled_at: payload.scheduled_at ? new Date(String(payload.scheduled_at)).toISOString() : null, timezone: payload.timezone || "Africa/Douala", reason: payload.reason, status: "pending", created_by: userId });
    setMessage(error ? error.message : "Rendez-vous demande. Une confirmation automatique sera envoyee des que le creneau est valide.");
    if (!error) e.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Dieteticien<select name="dietitian_id" className="admin-input"><option value="">Premier disponible</option>{dietitians.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Type<select name="appointment_type" className="admin-input"><option value="teleconsultation">Teleconsultation</option><option value="onsite">Sur site</option><option value="follow_up">Suivi</option><option value="child_growth">Croissance enfant</option><option value="health_review">Bilan sante</option></select></label><label className="grid gap-2 text-sm font-bold">Creneau<input name="scheduled_at" type="datetime-local" required className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Fuseau horaire<select name="timezone" className="admin-input"><option value="Africa/Douala">Africa/Douala</option><option value="Africa/Lagos">Africa/Lagos</option><option value="Europe/Paris">Europe/Paris</option><option value="America/Toronto">America/Toronto</option></select></label><label className="grid gap-2 text-sm font-bold md:col-span-2">Motif<textarea name="reason" rows={4} className="admin-input" /></label><button className="btn-primary justify-self-start md:col-span-2">Demander le rendez-vous</button>{message && <p className="font-bold text-leaf md:col-span-2">{message}</p>}</form>;
}
