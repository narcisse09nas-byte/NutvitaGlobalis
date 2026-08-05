"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PromoCodeCard({ userId, referredByMatricule }: { userId: string; referredByMatricule: string | null }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(referredByMatricule);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const value = code.trim().toUpperCase();
    const supabase = createClient();
    const { data: promoter, error: lookupError } = await supabase.from("promoter_profiles").select("id,matricule").eq("matricule", value).eq("status", "active").maybeSingle();
    if (lookupError || !promoter) { setMessage("Code promoteur invalide."); setLoading(false); return; }
    const { error } = await supabase.from("client_profiles").update({ referred_by_promoter_id: promoter.id }).eq("id", userId);
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setSaved(promoter.matricule);
    setMessage("Code promoteur enregistré.");
  }

  return <section className="rounded-2xl border bg-white p-6">
    <h2 className="text-xl font-black">Code promoteur</h2>
    {saved
      ? <p className="mt-3 text-sm text-slate-500">Vous avez été référé par le promoteur <b className="text-forest">{saved}</b>. Une commission lui est reversée sur vos paiements.</p>
      : <>
        <p className="mt-2 text-sm text-slate-500">Si un promoteur NutVitaGlobalis vous a référé, indiquez son code ici. Il ne peut être renseigné qu'une seule fois.</p>
        <form onSubmit={submit} className="mt-4 flex flex-wrap gap-3">
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="NVG001P" className="admin-input max-w-xs" />
          <button disabled={loading || !code.trim()} className="btn-secondary">{loading ? "Vérification..." : "Enregistrer"}</button>
        </form>
      </>}
    {message && <p className="mt-3 text-sm font-bold text-leaf">{message}</p>}
  </section>;
}
