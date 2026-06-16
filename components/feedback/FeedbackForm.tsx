"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FeedbackForm({ clientId, serviceType = "support", serviceId }: { clientId?: string; serviceType?: string; serviceId?: string }) {
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    const { error } = await createClient().from("customer_feedback").insert({ client_id: clientId || null, service_type: serviceType, service_id: serviceId || null, rating: Number(payload.rating), comment: payload.comment, suggestions: payload.suggestions });
    setMessage(error ? error.message : "Merci pour votre evaluation.");
    if (!error) e.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-6"><h2 className="text-2xl font-black">Votre satisfaction</h2><label className="grid gap-2 text-sm font-bold">Note<select name="rating" required className="admin-input"><option value="5">5 etoiles</option><option value="4">4 etoiles</option><option value="3">3 etoiles</option><option value="2">2 etoiles</option><option value="1">1 etoile</option></select></label><textarea name="comment" className="admin-input" rows={3} placeholder="Commentaire" /><textarea name="suggestions" className="admin-input" rows={3} placeholder="Suggestions" /><button className="btn-primary justify-self-start">Envoyer</button>{message && <p className="font-bold text-leaf">{message}</p>}</form>;
}
