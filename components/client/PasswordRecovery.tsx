"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function PasswordRecovery() {
  const [recovery, setRecovery] = useState(false), [message, setMessage] = useState(""), [loading, setLoading] = useState(false);
  useEffect(() => { createClient().auth.getUser().then(({ data }) => setRecovery(Boolean(data.user))); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(""); const fd = new FormData(event.currentTarget), supabase = createClient();
    if (recovery) {
      const password = String(fd.get("password"));
      if (password !== String(fd.get("confirmation"))) { setMessage("Les mots de passe ne correspondent pas."); setLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password }); setMessage(error ? error.message : "Mot de passe mis a jour. Vous pouvez vous connecter.");
    } else {
      const callback = `${location.origin}/auth/callback?next=${encodeURIComponent("/mot-de-passe-oublie")}`;
      const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")), { redirectTo: callback }); setMessage(error ? error.message : "Un lien de reinitialisation vous a ete envoye.");
    }
    setLoading(false);
  }
  return <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"><Link href="/" className="text-xl font-black text-forest">NutVita<span className="text-orange">Globalis</span></Link><h1 className="mt-7 text-3xl font-black">Mot de passe oublie</h1><form onSubmit={submit} className="mt-7 grid gap-4">{recovery ? <><label className="grid gap-2 text-sm font-bold">Nouveau mot de passe<input name="password" type="password" minLength={8} required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Confirmation<input name="confirmation" type="password" minLength={8} required className="admin-input"/></label></> : <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input"/></label>}{message && <p className="rounded-xl bg-mint p-3 text-sm">{message}</p>}<button disabled={loading} className="btn-primary">{recovery ? "Changer le mot de passe" : "Envoyer le lien"}</button></form><Link href="/connexion" className="mt-5 inline-block text-sm font-bold text-leaf">Retour a la connexion</Link></div>;
}
