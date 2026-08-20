import ProfessionalFinder, { type FinderProfessional } from "@/components/appointments/ProfessionalFinder";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getActiveMedicalSpecialists } from "@/lib/medical-specialists";
import { medicalSpecialties } from "@/lib/medical-specialty-data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Trouver un spécialiste | NutVitaGlobalis" };

export default async function Page({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const locale = await getCurrentLocale();
  const english = locale === "en";
  const supabase = await createClient();
  const [{ data: { user } }, specialists, params] = await Promise.all([supabase.auth.getUser(), getActiveMedicalSpecialists(), searchParams]);
  const professionals: FinderProfessional[] = specialists.map((item: any) => ({
    id: item.id, name: item.full_name,
    profession: medicalSpecialties.find((specialty) => specialty.value === item.specialty)?.[english ? "en" : "fr"] || item.specialty,
    category: item.specialty,
    photo: item.photo_url, sex: item.sex, city: item.city, country: item.country,
    languages: item.languages || ["fr", "en"], modes: item.consultation_modes || ["video", "office"],
    nextAvailability: item.next_availability, experience: item.years_experience,
    profileHref: `/consultations-medicales/specialistes/${item.id}`,
  }));
  return <main className="min-h-screen bg-slate-50 py-12"><div className="container-site"><p className="text-sm text-slate-500">{english ? "Home / Specialist consultations / Find a specialist" : "Accueil / Consultations médicales spécialisées / Trouver un spécialiste"}</p><div className="mt-8 max-w-4xl"><span className="rounded-full bg-mint px-4 py-2 text-xs font-black uppercase tracking-widest text-leaf">{english ? "Licensed healthcare professionals" : "Professionnels de santé habilités"}</span><h1 className="mt-5 text-4xl font-black text-forest md:text-6xl">{english ? "Find a specialist" : "Trouver un spécialiste"}</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{english ? "Choose a qualified specialist, review their profile and submit your preferred appointment time." : "Choisissez un spécialiste qualifié, consultez son profil et proposez votre créneau de rendez-vous."}</p></div><ProfessionalFinder professionals={professionals} requestType="medical" options={medicalSpecialties.map((item) => ({ value: item.value, fr: item.fr, en: item.en }))} english={english} signedIn={Boolean(user)} initialProfessionalId={params.book}/></div></main>;
}
