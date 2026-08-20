import { notFound, redirect } from "next/navigation";
import ConsultationPaymentOptions from "@/components/checkout/ConsultationPaymentOptions";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string; request?: string }> }) {
  const params = await searchParams;
  const requestType = params.type === "medical" ? "medical" : params.type === "dietetic" ? "dietetic" : null;
  if (!requestType || !params.request) notFound();
  const locale = await getCurrentLocale();
  const english = locale === "en";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/espace-client/paiement-consultation?type=${requestType}&request=${params.request}`)}`);

  let requestRow: any = null;
  let productId = "";
  let professionalName = "";
  if (requestType === "dietetic") {
    const { data } = await supabase.from("consultation_waiting_room").select("id,client_id,teleconseil_id,selected_partner_id,status,proposed_start,requested_start,dietitian_profiles!selected_partner_id(full_name)").eq("id", params.request).eq("client_id", user.id).maybeSingle();
    const row = data as any;
    requestRow = row;
    productId = row?.teleconseil_id || "";
    professionalName = Array.isArray(row?.dietitian_profiles) ? row.dietitian_profiles[0]?.full_name : row?.dietitian_profiles?.full_name;
  } else {
    const { data } = await supabase.from("medical_consultations").select("id,client_id,specialist_id,status,proposed_start,requested_start,scheduled_at,medical_specialists(full_name)").eq("id", params.request).eq("client_id", user.id).maybeSingle();
    const row = data as any;
    requestRow = row;
    productId = row?.specialist_id || "";
    professionalName = Array.isArray(row?.medical_specialists) ? row.medical_specialists[0]?.full_name : row?.medical_specialists?.full_name;
  }
  if (!requestRow || !productId || requestRow.status !== "accepted_pending_payment") notFound();
  const dateValue = requestRow.proposed_start || requestRow.scheduled_at || requestRow.requested_start;

  return <main className="min-h-screen bg-slate-100 py-12">
    <div className="container-site max-w-5xl">
      <a href="/espace-client" className="font-bold text-leaf">← {english ? "Back to my space" : "Retour à mon espace"}</a>
      <section className="mt-7 grid overflow-hidden rounded-[36px] bg-white shadow-xl lg:grid-cols-[1.1fr_.9fr]">
        <div className="bg-forest p-8 text-white sm:p-12">
          <p className="text-xs font-black uppercase tracking-[.22em] text-orange">{english ? "Appointment accepted" : "Rendez-vous accepté"}</p>
          <h1 className="mt-4 text-4xl font-black">{english ? "Confirm your consultation" : "Confirmez votre consultation"}</h1>
          <p className="mt-5 text-lg leading-8 text-white/75">{english ? "Your professional confirmed the appointment. Payment activates the consultation and all Premium health-monitoring tools." : "Votre professionnel a confirmé le rendez-vous. Le paiement active la consultation et tous les outils du suivi santé Premium."}</p>
          <dl className="mt-8 grid gap-4 rounded-3xl bg-white/10 p-6">
            <div><dt className="text-xs font-black uppercase text-white/60">{english ? "Professional" : "Professionnel"}</dt><dd className="mt-1 text-lg font-black">{professionalName || "NutVitaGlobalis"}</dd></div>
            <div><dt className="text-xs font-black uppercase text-white/60">{english ? "Date" : "Date"}</dt><dd className="mt-1 text-lg font-black">{dateValue ? new Date(dateValue).toLocaleString(english ? "en-GB" : "fr-FR", { dateStyle: "long", timeStyle: "short" }) : "—"}</dd></div>
          </dl>
        </div>
        <div className="p-8 sm:p-12"><h2 className="text-2xl font-black text-forest">{english ? "Choose a payment method" : "Choisissez un moyen de paiement"}</h2><p className="mt-2 text-slate-500">{english ? "Bank transfer, credit card and Mobile Money are available." : "Le virement bancaire, la carte de crédit et le Mobile Money sont disponibles."}</p><div className="mt-7"><ConsultationPaymentOptions requestId={requestRow.id} requestType={requestType} productId={productId} english={english} /></div></div>
      </section>
    </div>
  </main>;
}
