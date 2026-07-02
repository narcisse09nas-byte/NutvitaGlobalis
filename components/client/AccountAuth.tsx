"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SignupFields from "@/components/accounts/SignupFields";
import { createClient } from "@/lib/supabase/client";
import { hasLocalAdminMode } from "@/lib/supabase/config";

export default function AccountAuth({ mode, redirectTo = "/espace-client", initialIdentifier = "" }: { mode: "login" | "signup"; redirectTo?: string; initialIdentifier?: string }) {
  const router = useRouter(), [message, setMessage] = useState(""), [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const fd = new FormData(event.currentTarget), email = String(fd.get("email")), password = String(fd.get("password")), supabase = createClient();
    if (mode === "login" && hasLocalAdminMode()) {
      const response=await fetch('/api/client/local-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}),result=await response.json();
      if(!response.ok){setMessage(result.message);setLoading(false);return}
      localStorage.setItem('nutvita-local-client','1');router.push(redirectTo);router.refresh();return;
    }
    if (mode === "login") {
      const response=await fetch('/api/client/username-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:email,password})}),result=await response.json();
      if(!response.ok){setMessage(result.message);setLoading(false);return}
      router.push(redirectTo); router.refresh(); return;
    }
    if(mode==="signup"&&hasLocalAdminMode()){setMessage("La creation de nouveaux comptes sera activee avec Supabase. Utilisez le compte de demonstration local.");setLoading(false);return}
    if (password !== String(fd.get("password_confirmation"))) { setMessage("Les mots de passe ne correspondent pas."); setLoading(false); return; }
    const payload = { email, password, full_name: String(fd.get("full_name")), whatsapp_phone: String(fd.get("whatsapp_phone")), country: String(fd.get("country")), country_code: String(fd.get("country_code")), state_region: String(fd.get("state_region")), city: String(fd.get("city")) === "__other" ? String(fd.get("other_city")) : String(fd.get("city")), other_city: String(fd.get("other_city") || ""), accepted_terms: fd.get("terms") === "on", accepted_privacy: fd.get("privacy") === "on" };
    const response = await fetch("/api/auth/client-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.message || "Creation du compte impossible."); setLoading(false); return; }
    setMessage(result.message); setLoading(false);
  }
  return <div className={`w-full ${mode === "signup" ? "max-w-2xl" : "max-w-md"} rounded-3xl bg-white p-8 shadow-2xl`}><Link href="/" className="text-xl font-black text-forest">NutVita<span className="text-orange">Globalis</span></Link><h1 className="mt-7 text-3xl font-black">{mode === "login" ? "Connexion client" : "Creer mon compte"}</h1><p className="mt-2 text-slate-500">{mode === "login" ? "Utilisez votre email ou votre nom d utilisateur." : "Un compte est requis avant tout achat."}</p>{mode==='login'&&hasLocalAdminMode()&&<p className="mt-4 rounded-xl bg-mint p-3 text-sm"><b>Compte de demonstration</b><br/>client.demo ou client@nutvitaglobalis.com</p>}<form onSubmit={submit} className="mt-7 grid gap-4">{mode === "signup" ? <SignupFields/> : <><label className="grid gap-2 text-sm font-bold">Email ou nom d utilisateur<input name="email" type="text" defaultValue={initialIdentifier} required className="admin-input"/></label><label className="grid gap-2 text-sm font-bold">Mot de passe<input name="password" type="password" minLength={8} required className="admin-input"/></label></>}{message && <p className="rounded-xl bg-mint p-3 text-sm">{message}</p>}<button disabled={loading} className="btn-primary">{loading ? "Patientez..." : mode === "login" ? "Se connecter" : "Creer mon compte"}</button></form><div className="mt-5 flex flex-wrap justify-between gap-3 text-sm font-bold text-leaf">{mode === "login" ? <><Link href={`/inscription?redirect=${encodeURIComponent(redirectTo)}`}>Creer un compte</Link><Link href="/mot-de-passe-oublie">Mot de passe oublie</Link></> : <Link href={`/connexion?redirect=${encodeURIComponent(redirectTo)}`}>J ai deja un compte</Link>}</div></div>;
}
