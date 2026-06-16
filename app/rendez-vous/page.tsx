import AppointmentBooking from "@/components/appointments/AppointmentBooking";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Rendez-vous" };

export default async function Page() {
  const supabase = await createClient();
  const [{ data: dietitians }, { data: { user } }] = await Promise.all([
    supabase.from("dietitian_profiles").select("id,full_name,specialties,languages").eq("status", "active").order("full_name"),
    supabase.auth.getUser(),
  ]);
  return <main><MedicalDisclaimer /><section className="section bg-mint"><div className="container-site max-w-4xl text-center"><p className="eyebrow">Reservation</p><h1 className="text-4xl font-black md:text-6xl">Prendre rendez-vous</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">Choisissez un dieteticien, un type de consultation, un creneau et votre fuseau horaire. La confirmation sera journalisee et notifiee.</p></div></section><section className="section"><div className="container-site max-w-4xl"><AppointmentBooking dietitians={dietitians || []} userId={user?.id} /></div></section></main>;
}
