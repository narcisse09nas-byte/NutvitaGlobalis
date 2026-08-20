"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import GeoFields from "@/components/accounts/GeoFields";
import { documentFields, specialties } from "@/lib/recruitment-data";

const field = "admin-input";
type InitialProfile = { full_name: string; email: string; phone: string } | null;

export default function PublicApplicationForm({ kind, jobOfferId, locale = "fr", initialProfile = null }: { kind: "dietitian" | "promoter"; jobOfferId?: string; locale?: "fr" | "en"; initialProfile?: InitialProfile }) {
  const en = locale === "en";
  const router = useRouter();
  const loggedIn = Boolean(initialProfile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const isPromoter = kind === "promoter";
  const requiredDocs = isPromoter ? documentFields.filter(([key]) => key === "identity") : documentFields;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    formData.set("recruitment_type", isPromoter ? "promoter" : "dietitian_partner");
    if (jobOfferId) formData.set("job_offer_id", jobOfferId);
    domains.forEach(d => formData.append("intervention_domains", d));
    const response = await fetch("/api/recruitment/apply", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(result.message || "");
    if (response.ok) { router.push("/candidat?submitted=1"); router.refresh(); }
  }

  return <form onSubmit={submit} className="grid gap-8">
    {loggedIn && <p className="rounded-xl bg-mint p-4 text-sm font-bold text-forest">{en ? `Signed in as ${initialProfile!.email}. Your information is pre-filled below.` : `Connecté en tant que ${initialProfile!.email}. Vos informations sont déjà pré-remplies ci-dessous.`}</p>}
    <Section title={en ? "Your information" : "Vos informations"}>
      <Text name="full_name" label={en ? "Full name" : "Nom complet"} defaultValue={initialProfile?.full_name} required />
      <Text name="birth_date" label={en ? "Date of birth" : "Date de naissance"} type="date" required />
      <Text name="email" label="Email" type="email" defaultValue={initialProfile?.email} readOnly={loggedIn} required />
      <Text name="whatsapp_phone" label={en ? "WhatsApp phone" : "Téléphone WhatsApp"} defaultValue={initialProfile?.phone} required />
      {!loggedIn && <><Text name="password" label={en ? "Password" : "Mot de passe"} type="password" minLength={8} required /><Text name="password_confirmation" label={en ? "Confirm password" : "Confirmation du mot de passe"} type="password" minLength={8} required /></>}
      <div className="md:col-span-2"><GeoFields locale={locale} /></div>
      <Text name="address" label={en ? "Address (optional)" : "Adresse (facultatif)"} />
    </Section>

    {isPromoter ? (
      <Section title={en ? "Your motivation" : "Votre motivation"}>
        <label className="grid gap-2 text-sm font-bold md:col-span-2">{en ? "Why do you want to become a NutVitaGlobalis promoter? Describe your network and motivation." : "Pourquoi souhaitez-vous devenir promoteur NutVitaGlobalis ? Décrivez votre réseau et votre motivation."}
          <textarea className={field} name="professional_references" rows={5} required />
        </label>
      </Section>
    ) : (
      <Section title={en ? "Professional profile" : "Profil professionnel"}>
        <Text name="professional_title" label={en ? "Professional title" : "Titre professionnel"} required />
        <Text name="highest_degree" label={en ? "Highest degree" : "Diplôme le plus élevé"} required />
        <Text name="specialization" label={en ? "Area of specialization" : "Domaine de spécialisation"} required />
        <Text name="years_experience" label={en ? "Years of experience" : "Années d'expérience"} type="number" required />
        <Text name="weekly_availability" label={en ? "Weekly availability" : "Disponibilité hebdomadaire"} />
        <Text name="desired_rate" label={en ? "Desired rate per consultation (FCFA)" : "Tarif souhaité par consultation (FCFA)"} type="number" />
        <div className="md:col-span-2">
          <p className="mb-3 text-sm font-bold">{en ? "Preferred intervention domains" : "Domaines d'intervention souhaités"}</p>
          <div className="flex flex-wrap gap-2">{specialties.map(x => <label key={x} className="flex cursor-pointer gap-2 rounded-full border bg-white px-4 py-2 text-sm"><input type="checkbox" checked={domains.includes(x)} onChange={() => setDomains(current => current.includes(x) ? current.filter(v => v !== x) : [...current, x])} />{x}</label>)}</div>
        </div>
        <label className="grid gap-2 text-sm font-bold md:col-span-2">{en ? "Professional references (optional)" : "Références professionnelles (facultatif)"}<textarea className={field} name="professional_references" rows={3} /></label>
      </Section>
    )}

    <Section title={en ? "Documents to upload" : "Documents à téléverser"}>
      {requiredDocs.map(([key, label]) => <div key={key} className="rounded-xl border bg-white p-4"><p className="font-bold">{label}</p><input className="mt-3 text-sm" type="file" name={`document_${key}`} multiple accept=".pdf,.jpg,.jpeg,.png" required /></div>)}
    </Section>

    <Section title={en ? "Declarations" : "Déclarations"}>
      {(isPromoter
        ? [["declaration_accuracy", en ? "I certify that the information provided is accurate." : "Je certifie que les informations fournies sont exactes."], ["declaration_privacy", en ? "I accept the confidentiality terms and the promoter programme conditions." : "J'accepte les conditions de confidentialité et du programme promoteurs."]]
        : [["declaration_accuracy", en ? "I certify that the information provided is accurate." : "Je certifie que les informations fournies sont exactes."], ["declaration_references", en ? "I agree that NutVitaGlobalis may verify my references." : "J'accepte que NutVitaGlobalis vérifie mes références."], ["declaration_privacy", en ? "I accept the privacy terms." : "J'accepte les conditions de confidentialité."], ["declaration_standards", en ? "I agree to uphold NutVitaGlobalis professional standards." : "J'accepte de respecter les standards professionnels de NutVitaGlobalis."]]
      ).map(([name, label]) => <label key={name} className="flex gap-3 md:col-span-2"><input type="checkbox" name={name} required className="mt-1 h-5 w-5" /><span>{label}</span></label>)}
    </Section>

    {!loggedIn && <p className="rounded-xl bg-mint p-4 text-sm">{en ? "Your NutVitaGlobalis account and candidate workspace will be created upon submission." : "Votre compte NutVitaGlobalis et votre espace candidat seront créés dès l'envoi."}</p>}
    {message && <p className="rounded-xl bg-amber-50 p-4 font-semibold text-amber-900">{message}</p>}
    <div className="flex flex-wrap items-center gap-4">
      <button disabled={busy} className="btn-primary">{busy ? (en ? "Sending..." : "Envoi...") : (en ? "Submit my application" : "Soumettre ma candidature")}</button>
      {!loggedIn && <Link href={`/connexion?redirect=${encodeURIComponent("/candidat")}`} className="text-sm font-bold text-leaf">{en ? "I already have an account" : "J'ai déjà un compte"}</Link>}
    </div>
  </form>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border bg-slate-50 p-6"><h2 className="mb-5 text-2xl font-black">{title}</h2><div className="grid gap-5 md:grid-cols-2">{children}</div></section>; }
function Text({ name, label, type = "text", defaultValue, readOnly, required, minLength }: { name: string; label: string; type?: string; defaultValue?: string; readOnly?: boolean; required?: boolean; minLength?: number }) {
  return <label className="grid gap-2 text-sm font-bold">{label}<input className={field} name={name} type={type} defaultValue={defaultValue} readOnly={readOnly} required={required} minLength={minLength} /></label>;
}
