"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Country = { code: string; name: string };

export default function FosaAuth({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [newAccount, setNewAccount] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    if (mode === "signup") {
      fetch("/api/geo?type=countries")
        .then(response => response.json())
        .then(setCountries)
        .catch(() => setCountries([{ code: "CM", name: "Cameroun" }]));
    }
  }, [mode]);

  async function attachExistingAccount(data: Record<string, FormDataEntryValue>, countryCode: string, country: string) {
    const supabase = createClient();
    const email = String(data.email).trim().toLowerCase();
    const current = await supabase.auth.getUser();
    if (!current.data.user || current.data.user.email?.toLowerCase() !== email) {
      const login = await supabase.auth.signInWithPassword({ email, password: String(data.password) });
      if (login.error) {
        throw new Error("Cette adresse est deja utilisee. Saisissez le mot de passe du compte existant, ou utilisez le lien Mot de passe oublie.");
      }
    }
    const response = await fetch("/api/fosa/request-existing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, country_code: countryCode, country }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: String(data.email), password: String(data.password) });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      router.push("/fosa/espace");
      router.refresh();
      return;
    }

    if (data.password !== data.password_confirmation) {
      setMessage("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    const countryCode = String(data.country_code || "");
    const country = countries.find(item => item.code === countryCode)?.name || countryCode;
    const response = await fetch("/api/fosa/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, country_code: countryCode, country }),
    });
    const result = await response.json();

    if (!response.ok) {
      if (result.code === "EMAIL_EXISTS") {
        try {
          await attachExistingAccount(data, countryCode, country);
          form.reset();
          setNewAccount(false);
          setMessage("Votre compte NutVitaGlobalis existant a ete associe a une demande d'espace FOSA. Aucune nouvelle confirmation d'email n'est necessaire. La demande sera examinee par l'administration.");
          setCompleted(true);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Association du compte impossible.");
        }
        setLoading(false);
        return;
      }
      setMessage(result.message);
      setLoading(false);
      return;
    }

    form.reset();
    setNewAccount(true);
    setMessage("Compte cree. Confirmez votre adresse email. Votre demande sera ensuite examinee par NutVitaGlobalis.");
    setCompleted(true);
    setLoading(false);
  }

  if (completed) return <div className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-2xl">
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mint text-lg font-black text-leaf">OK</div>
    <h1 className="mt-6 text-3xl font-black">Demande enregistree</h1>
    <p className="mt-4 leading-7 text-slate-600">{message}</p>
    {newAccount && <p className="mt-3 text-sm text-slate-500">Pensez a verifier le dossier courrier indesirable ou spam.</p>}
    <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/" className="btn-primary">Retour a la page principale</Link><Link href="/fosa/connexion" className="btn-secondary">Connexion FOSA</Link></div>
  </div>;

  return <div className={`w-full ${mode === "signup" ? "max-w-2xl" : "max-w-md"} rounded-3xl bg-white p-8 shadow-2xl`}>
    <Link href="/fosa" className="text-sm font-bold text-leaf">Retour au service FOSA</Link>
    <h1 className="mt-5 text-3xl font-black">{mode === "login" ? "Connexion FOSA" : "Demander un espace FOSA"}</h1>
    <p className="mt-2 text-slate-500">{mode === "login" ? "Accedez a votre organisation et aux formations sanitaires autorisees." : "Utilisez une nouvelle adresse ou votre compte NutVitaGlobalis existant. L'acces sera ouvert apres validation."}</p>
    <form onSubmit={submit} className="mt-7 grid gap-4 md:grid-cols-2">
      {mode === "signup" && <>
        <label className="grid gap-2 text-sm font-bold">Nom du responsable<input name="full_name" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Organisation<input name="organization_name" required className="admin-input" placeholder="District, ONG, programme..." /></label>
        <label className="grid gap-2 text-sm font-bold">Telephone<input name="phone" type="tel" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Pays<select name="country_code" required defaultValue="CM" className="admin-input"><option value="">Selectionner un pays</option>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Nombre de formations sanitaires a suivre<input name="requested_facility_count" type="number" min="1" max="1000" required defaultValue="1" className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Nombre de personnes/staff a associer<input name="requested_staff_count" type="number" min="1" max="100000" required defaultValue="5" className="admin-input" /></label>
      </>}
      <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Mot de passe<input name="password" type="password" minLength={8} required className="admin-input" /></label>
      {mode === "signup" && <label className="grid gap-2 text-sm font-bold">Confirmation<input name="password_confirmation" type="password" minLength={8} required className="admin-input" /></label>}
      {message && <p className="rounded-xl bg-mint p-3 text-sm md:col-span-2">{message}</p>}
      <button disabled={loading} className="btn-primary justify-self-start md:col-span-2">{loading ? "Traitement..." : mode === "login" ? "Se connecter" : "Envoyer la demande FOSA"}</button>
    </form>
    <div className="mt-5 flex flex-wrap gap-5 text-sm font-bold text-leaf">{mode === "login" ? <Link href="/fosa/inscription">Demander un espace FOSA</Link> : <><Link href="/fosa/connexion">J'ai deja un espace FOSA</Link><Link href="/mot-de-passe-oublie">Mot de passe oublie</Link></>}</div>
  </div>;
}
