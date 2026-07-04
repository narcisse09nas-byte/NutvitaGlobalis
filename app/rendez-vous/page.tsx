import AppointmentBooking from "@/components/appointments/AppointmentBooking";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { createClient } from "@/lib/supabase/server";
import {getCurrentLocale} from "@/lib/i18n-server";

export const metadata = { title: "Rendez-vous" };

export default async function Page() {
  const locale=await getCurrentLocale();
  const supabase = await createClient();
  const [{ data: dietitians }, { data: { user } }] = await Promise.all([
    supabase.from("dietitian_profiles").select("id,full_name,specialties,languages").eq("status", "active").order("full_name"),
    supabase.auth.getUser(),
  ]);
  return <main><MedicalDisclaimer /><section className="section bg-mint"><div className="container-site max-w-4xl text-center"><p className="eyebrow">{locale==="en"?"Booking":"Reservation"}</p><h1 className="text-4xl font-black md:text-6xl">{locale==="en"?"Book an appointment":"Prendre rendez-vous"}</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">{locale==="en"?"Choose a dietitian, consultation type, time slot and time zone. Confirmation will be recorded and notified.":"Choisissez un dieteticien, un type de consultation, un creneau et votre fuseau horaire. La confirmation sera journalisee et notifiee."}</p></div></section><section className="section"><div className="container-site max-w-4xl"><AppointmentBooking dietitians={dietitians || []} userId={user?.id} locale={locale}/></div></section></main>;
}
