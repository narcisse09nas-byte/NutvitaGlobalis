"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Search, UserRound, X } from "lucide-react";

export type FinderProfessional = {
  id: string;
  name: string;
  profession: string;
  category?: string | null;
  photo?: string | null;
  sex?: string | null;
  city?: string | null;
  country?: string | null;
  languages?: string[] | null;
  modes?: string[] | null;
  nextAvailability?: string | null;
  experience?: number | null;
  profileHref: string;
};

type Option = { value: string; fr: string; en: string };

export default function ProfessionalFinder({
  professionals,
  requestType,
  options,
  english,
  signedIn,
  initialProfessionalId,
}: {
  professionals: FinderProfessional[];
  requestType: "dietetic" | "medical";
  options: Option[];
  english: boolean;
  signedIn: boolean;
  initialProfessionalId?: string;
}) {
  const t = (fr: string, en: string) => (english ? en : fr);
  const [query, setQuery] = useState("");
  const [need, setNeed] = useState("");
  const [mode, setMode] = useState("");
  const [language, setLanguage] = useState("");
  const [selected, setSelected] = useState<FinderProfessional | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialProfessionalId) {
      const professional = professionals.find((item) => item.id === initialProfessionalId);
      if (professional && signedIn) setSelected(professional);
    }
  }, [initialProfessionalId, professionals, signedIn]);

  const filtered = useMemo(() => professionals.filter((professional) => {
    const haystack = [professional.name, professional.profession, professional.city, professional.country].join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (!need || requestType !== "medical" || professional.category === need)
      && (!mode || professional.modes?.includes(mode))
      && (!language || professional.languages?.includes(language));
  }), [professionals, query, need, mode, language, requestType]);

  function book(professional: FinderProfessional) {
    if (!signedIn) {
      const destination = requestType === "medical" ? "/consultations-medicales/specialistes" : "/nutritionnistes";
      location.href = `/connexion?redirect=${encodeURIComponent(`${destination}?book=${professional.id}`)}`;
      return;
    }
    setMessage("");
    setSelected(professional);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/consultation-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        request_type: requestType,
        professional_id: form.get("professional_id"),
        care_need: form.get("care_need"),
        other_care_need: form.get("other_care_need"),
        reason: form.get("reason"),
        requested_start: form.get("requested_start"),
        duration_minutes: Number(form.get("duration_minutes") || 45),
        consultation_mode: form.get("consultation_mode"),
        allow_alternative: form.get("allow_alternative") === "on",
        locale: english ? "en" : "fr",
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(result.message || t("La demande n’a pas pu être envoyée.", "The request could not be sent."));
    setMessage(t("Votre demande a été transmise au professionnel et enregistrée dans la salle d’attente.", "Your request was sent to the professional and registered in the waiting room."));
  }

  return <>
    <section className="mt-8 grid gap-4 rounded-3xl border bg-white p-6 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-bold">{t("Recherche", "Search")}<span className="relative mt-2 block"><Search className="absolute left-4 top-3.5 h-5 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} className="admin-input w-full pl-12" placeholder={t("Nom, ville, mot-clé…", "Name, city, keyword…")}/></span></label>
      <label className="text-sm font-bold">{requestType === "medical" ? t("Spécialité", "Specialty") : t("Accompagnement souhaité", "Desired support")}<select value={need} onChange={(e) => setNeed(e.target.value)} className="admin-input mt-2 w-full"><option value="">{t("Toutes les options", "All options")}</option>{options.map((option) => <option key={option.value} value={option.value}>{english ? option.en : option.fr}</option>)}</select></label>
      <label className="text-sm font-bold">{t("Mode de consultation", "Consultation mode")}<select value={mode} onChange={(e) => setMode(e.target.value)} className="admin-input mt-2 w-full"><option value="">{t("Tous les modes", "All modes")}</option><option value="video">{t("En ligne", "Online")}</option><option value="office">{t("En présentiel", "In person")}</option><option value="home">{t("À domicile", "At home")}</option></select></label>
      <label className="text-sm font-bold">{t("Langue", "Language")}<select value={language} onChange={(e) => setLanguage(e.target.value)} className="admin-input mt-2 w-full"><option value="">{t("Toutes les langues", "All languages")}</option><option value="fr">Français</option><option value="en">English</option></select></label>
    </section>

    <div className="mt-8 overflow-x-auto rounded-3xl border bg-white shadow-sm">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-5">{t("Professionnel", "Professional")}</th><th className="p-5">{requestType === "medical" ? t("Spécialité", "Specialty") : t("Domaines d’accompagnement", "Support areas")}</th><th className="p-5">{t("Localisation", "Location")}</th><th className="p-5">{t("Prochaine disponibilité", "Next availability")}</th><th className="p-5">{t("Actions", "Actions")}</th></tr></thead>
        <tbody className="divide-y">{filtered.map((professional) => <tr key={professional.id} className="hover:bg-slate-50/70"><td className="p-5"><div className="flex items-center gap-4">{professional.photo ? <img src={professional.photo} alt="" className="h-14 w-14 rounded-2xl object-cover"/> : <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-leaf"><UserRound className="h-7"/></span>}<span><b className="block text-base text-forest">{requestType === "medical" ? "Dr. " : ""}{professional.name}</b>{professional.experience ? <small className="text-slate-500">{professional.experience} {t("ans d’expérience", "years of experience")}</small> : null}</span></div></td><td className="p-5 font-semibold">{professional.profession}</td><td className="p-5">{[professional.city, professional.country].filter(Boolean).join(", ") || "—"}</td><td className="p-5 font-bold text-leaf">{professional.nextAvailability ? new Date(professional.nextAvailability).toLocaleString(english ? "en-GB" : "fr-FR") : t("Sur demande", "On request")}</td><td className="p-5"><div className="flex flex-wrap gap-2"><Link href={professional.profileHref} className="btn-secondary px-4 py-2">{t("Voir le profil", "View profile")}</Link><button onClick={() => book(professional)} className="btn-primary px-4 py-2">{t("Prendre rendez-vous", "Book appointment")}</button></div></td></tr>)}{!filtered.length && <tr><td colSpan={5} className="p-12 text-center text-slate-400">{t("Aucun professionnel ne correspond à ces critères.", "No professional matches these criteria.")}</td></tr>}</tbody>
      </table>
    </div>

    {selected && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4"><section className="mx-auto my-10 max-w-3xl overflow-hidden rounded-[2rem] bg-forest shadow-2xl"><div className="flex items-center justify-between px-7 py-6 text-white"><div><p className="text-xs font-black uppercase tracking-[.18em] text-orange">{t("Demande de rendez-vous", "Appointment request")}</p><h2 className="mt-1 text-2xl font-black">{requestType === "medical" ? t("Consulter un médecin spécialiste", "Consult a specialist doctor") : t("Consulter un nutritionniste/Diététicien", "Consult a nutritionist/Dietitian")}</h2></div><button onClick={() => setSelected(null)} aria-label={t("Fermer", "Close")}><X className="h-7"/></button></div><form onSubmit={submit} className="grid gap-5 rounded-t-[2rem] bg-white p-7 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold md:col-span-2">{t("Professionnel souhaité", "Preferred professional")}<select name="professional_id" defaultValue={selected.id} className="admin-input">{professionals.map((professional) => <option key={professional.id} value={professional.id}>{requestType === "medical" ? "Dr. " : ""}{professional.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{requestType === "medical" ? t("Besoin médical", "Medical need") : t("Accompagnement souhaité", "Desired support")}<select name="care_need" defaultValue={need} required className="admin-input"><option value="">{t("Sélectionner", "Select")}</option>{options.map((option) => <option key={option.value} value={option.value}>{english ? option.en : option.fr}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{t("Autre besoin, à préciser", "Other need, please specify")}<input name="other_care_need" className="admin-input"/></label>
      <label className="grid gap-2 text-sm font-bold">{t("Date et heure souhaitées", "Preferred date and time")}<input name="requested_start" type="datetime-local" required className="admin-input"/></label>
      <label className="grid gap-2 text-sm font-bold">{t("Durée", "Duration")}<select name="duration_minutes" className="admin-input"><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label>
      <label className="grid gap-2 text-sm font-bold md:col-span-2">{t("Mode", "Mode")}<select name="consultation_mode" className="admin-input"><option value="video">{t("En ligne", "Online")}</option><option value="office">{t("En présentiel", "In person")}</option><option value="home">{t("À domicile", "At home")}</option></select></label>
      <label className="grid gap-2 text-sm font-bold md:col-span-2">{t("Motif de consultation / plaintes", "Reason for consultation / complaints")}<textarea name="reason" required rows={5} className="admin-input"/></label>
      <label className="flex items-start gap-3 rounded-2xl bg-mint p-4 text-sm font-semibold md:col-span-2"><input name="allow_alternative" type="checkbox" defaultChecked className="mt-1 h-5 w-5 accent-leaf"/><span>{t("Si ce professionnel n’est pas disponible, j’accepte que NutVitaGlobalis me suggère ou m’attribue un autre professionnel qualifié.", "If this professional is unavailable, I agree that NutVitaGlobalis may suggest or assign another qualified professional.")}</span></label>
      {message && <p className="rounded-xl bg-mint p-4 font-bold text-leaf md:col-span-2">{message}</p>}
      <button disabled={saving} className="btn-primary justify-self-end md:col-span-2"><CalendarDays className="mr-2 h-5"/>{saving ? t("Envoi…", "Sending…") : t("Envoyer la demande", "Send request")}<ChevronRight className="ml-1 h-4"/></button>
    </form></section></div>}
  </>;
}
