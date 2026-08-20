"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import GeoFields from "@/components/accounts/GeoFields";

const field = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/15";
type InitialProfile = { full_name: string; email: string; phone: string } | null;

export default function PublicStaffApplicationForm({ offerId, initialProfile = null }: { offerId: string; initialProfile?: InitialProfile }) {
  const router = useRouter();
  const loggedIn = Boolean(initialProfile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    formData.set("offer_id", offerId);
    const response = await fetch("/api/staff-candidate/apply", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(result.message || "");
    if (response.ok) { router.push("/staff-candidat"); router.refresh(); }
  }

  return <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
    {loggedIn && <p className="md:col-span-2 rounded-xl bg-mint p-4 text-sm font-bold text-forest">Connecté en tant que {initialProfile!.email}. Vos informations sont déjà pré-remplies ci-dessous.</p>}
    <label className="text-sm font-bold">Nom complet<input className={field} name="full_name" defaultValue={initialProfile?.full_name} required /></label>
    <label className="text-sm font-bold">Email<input className={field} name="email" type="email" defaultValue={initialProfile?.email} readOnly={loggedIn} required /></label>
    <label className="text-sm font-bold">Téléphone<input className={field} name="phone" type="tel" defaultValue={initialProfile?.phone} required /></label>
    {!loggedIn && <><label className="text-sm font-bold">Mot de passe<input className={field} name="password" type="password" minLength={8} required /></label><label className="text-sm font-bold">Confirmation du mot de passe<input className={field} name="password_confirmation" type="password" minLength={8} required /></label></>}
    <label className="text-sm font-bold">Titre professionnel<input className={field} name="professional_title" required /></label>
    <label className="text-sm font-bold">Diplôme le plus élevé<input className={field} name="highest_degree" required /></label>
    <label className="text-sm font-bold">Années d'expérience<input className={field} name="years_experience" type="number" min="0" step="0.5" required /></label>
    <label className="text-sm font-bold">Adresse<input className={field} name="address" /></label>
    <div className="md:col-span-2 [&_input]:mt-2 [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-300 [&_input]:bg-white [&_input]:px-4 [&_select]:mt-2 [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:px-4"><GeoFields locale="fr" /></div>
    <label className="text-sm font-bold md:col-span-2">Lettre de motivation<textarea className={field} name="cover_letter" rows={5} minLength={50} required /></label>
    <label className="text-sm font-bold">CV (PDF, DOCX, JPG, PNG)<input className={field} name="cv" type="file" accept=".pdf,.docx,image/png,image/jpeg" required /></label>
    <label className="text-sm font-bold">Lettre signée (facultatif)<input className={field} name="motivation" type="file" accept=".pdf,.docx,image/png,image/jpeg" /></label>
    {!loggedIn && <p className="md:col-span-2 rounded-xl bg-mint p-4 text-sm">Votre compte NutVitaGlobalis et votre espace candidat Staff seront créés dès l'envoi.</p>}
    {message && <p className="md:col-span-2 font-bold text-orange">{message}</p>}
    <div className="md:col-span-2 flex flex-wrap items-center gap-4">
      <button disabled={busy} className="btn-primary">{busy ? "Envoi..." : "Soumettre ma candidature"}</button>
      {!loggedIn && <Link href={`/connexion?redirect=${encodeURIComponent("/staff-candidat")}`} className="text-sm font-bold text-leaf">J'ai déjà un compte</Link>}
    </div>
  </form>;
}
