import ProfessionalFinder, { type FinderProfessional } from "@/components/appointments/ProfessionalFinder";
import { nutritionCareOptions } from "@/data/consultation-care-options";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Trouver un nutritionniste | NutVitaGlobalis" };

export default async function Page({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const locale = await getCurrentLocale();
  const english = locale === "en";
  const supabase = await createClient();
  const [{ data: { user } }, { data }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("dietitian_profiles").select("*").eq("status", "active").order("full_name"),
  ]);
  const professionals: FinderProfessional[] = (data || []).map((item: any) => ({
    id: item.id,
    name: item.full_name || (english ? "Nutrition professional" : "Professionnel de nutrition"),
    profession: (item.specialties || []).join(", ") || (english ? "Nutritionist / Dietitian" : "Nutritionniste / Diététicien"),
    photo: item.avatar_url || item.photo_url || item.photo_path,
    sex: item.sex,
    city: item.city,
    country: item.country,
    languages: item.languages || ["fr", "en"],
    modes: item.consultation_modes || ["video", "office"],
    nextAvailability: item.next_availability,
    experience: item.years_experience,
    profileHref: `/nutritionnistes/${item.id}`,
  }));
  const params = await searchParams;
  return <main className="min-h-screen bg-slate-50 py-12"><div className="container-site">
    <p className="text-sm text-slate-500">{english ? "Home / Nutrition consultations / Find a nutritionist" : "Accueil / Consultations nutritionnelles / Trouver un nutritionniste"}</p>
    <div className="mt-8 max-w-4xl"><span className="rounded-full bg-mint px-4 py-2 text-xs font-black uppercase tracking-widest text-leaf">{english ? "Qualified professionals" : "Professionnels qualifiés"}</span><h1 className="mt-5 text-4xl font-black text-forest md:text-6xl">{english ? "Find a nutritionist / Dietitian" : "Trouver un nutritionniste / Diététicien"}</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{english ? "Choose the professional and support pathway that match your needs, then submit your preferred appointment time." : "Choisissez le professionnel et l’accompagnement correspondant à vos besoins, puis proposez votre créneau de rendez-vous."}</p></div>
    <ProfessionalFinder professionals={professionals} requestType="dietetic" options={nutritionCareOptions} english={english} signedIn={Boolean(user)} initialProfessionalId={params.book}/>
  </div></main>;
}
