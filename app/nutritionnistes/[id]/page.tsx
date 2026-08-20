import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProfessionalFinder, { type FinderProfessional } from "@/components/appointments/ProfessionalFinder";
import { nutritionCareOptions } from "@/data/consultation-care-options";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getCurrentLocale();
  const english = locale === "en";
  const supabase = await createClient();
  const [{ data: profile }, { data: { user } }] = await Promise.all([
    supabase.from("dietitian_profiles").select("*").eq("id", id).eq("status", "active").maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!profile) notFound();
  const professional: FinderProfessional = {
    id: profile.id,
    name: profile.full_name,
    profession: (profile.specialties || []).join(", ") || (english ? "Nutritionist / Dietitian" : "Nutritionniste / Diététicien"),
    photo: profile.avatar_url || profile.photo_url || profile.photo_path,
    sex: profile.sex,
    city: profile.city,
    country: profile.country,
    languages: profile.languages || ["fr", "en"],
    modes: profile.consultation_modes || ["video", "office"],
    nextAvailability: profile.next_availability,
    experience: profile.years_experience,
    profileHref: `/nutritionnistes/${profile.id}`,
  };
  return <main className="min-h-screen bg-slate-50 py-12"><div className="container-site"><Link href="/nutritionnistes" className="font-bold text-leaf">← {english ? "All nutritionists" : "Tous les nutritionnistes"}</Link><section className="mt-7 grid gap-10 rounded-[36px] border bg-white p-8 shadow-sm lg:grid-cols-[320px_1fr]"><div className="relative min-h-[380px] overflow-hidden rounded-3xl bg-mint">{professional.photo ? <Image src={professional.photo} alt={professional.name} fill unoptimized className="object-cover"/> : <span className="grid h-full place-items-center text-8xl text-leaf">{profile.sex === "male" ? "♂" : "♀"}</span>}</div><div><p className="font-black uppercase tracking-widest text-orange">{english ? "NutVitaGlobalis professional" : "Professionnel NutVitaGlobalis"}</p><h1 className="mt-3 text-4xl font-black text-forest md:text-5xl">{professional.name}</h1><p className="mt-3 text-xl font-bold text-leaf">{professional.profession}</p><div className="mt-7 grid gap-4 sm:grid-cols-3"><Info label={english ? "Experience" : "Expérience"} value={professional.experience ? `${professional.experience} ${english ? "years" : "ans"}` : "—"}/><Info label={english ? "Location" : "Localisation"} value={[professional.city, professional.country].filter(Boolean).join(", ") || "—"}/><Info label={english ? "Languages" : "Langues"} value={(professional.languages || []).join(", ")}/></div><p className="mt-8 max-w-3xl text-lg leading-8 text-slate-600">{(english ? profile.public_bio_en : profile.public_bio) || (english ? "Qualified nutrition professional approved by NutVitaGlobalis." : "Professionnel de nutrition qualifié et validé par NutVitaGlobalis.")}</p></div></section><ProfessionalFinder professionals={[professional]} requestType="dietetic" options={nutritionCareOptions} english={english} signedIn={Boolean(user)} initialProfessionalId={professional.id}/></div></main>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-mint p-5"><small className="text-slate-500">{label}</small><b className="mt-1 block text-lg text-forest">{value}</b></div>; }
