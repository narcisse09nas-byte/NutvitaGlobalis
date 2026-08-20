import Link from "next/link";
import { getCurrentLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import PublicApplicationForm from "@/components/recruitment/PublicApplicationForm";

export const metadata = { title: "Postuler — NutVitaGlobalis" };

export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string; offer?: string }> }) {
  const { type, offer } = await searchParams;
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const kind = type === "promoter" ? "promoter" : "dietitian";

  if (!hasSupabaseConfig()) {
    return <main className="container-site py-24 text-center">
      <p className="text-lg font-bold">{en ? "Applications are temporarily unavailable." : "Les candidatures sont temporairement indisponibles."}</p>
    </main>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let hasApplication = false;
  if (user) {
    const { data } = await supabase.from("recruitment_applications").select("id,status").eq("candidate_id", user.id).maybeSingle();
    hasApplication = Boolean(data) && !["started", "incomplete"].includes(data?.status || "");
  }
  const initialProfile = user ? { full_name: String(user.user_metadata?.full_name || ""), email: user.email || "", phone: String(user.user_metadata?.whatsapp_phone || user.user_metadata?.phone || "") } : null;

  const title = kind === "promoter"
    ? (en ? "Apply to become a NutVitaGlobalis promoter" : "Candidater au programme promoteurs NutVitaGlobalis")
    : (en ? "Apply to join our dietitian network" : "Candidater au réseau des diététiciens-nutritionnistes");

  return <main className="bg-[#fbfdfc] py-14">
    <div className="container-site max-w-4xl">
      <p className="text-xs font-black uppercase tracking-widest text-orange">NutVitaGlobalis</p>
      <h1 className="mt-2 text-4xl font-black leading-tight">{title}</h1>
      <p className="mt-4 max-w-2xl text-slate-600">{en ? "Fill in the form below to submit your application. Your candidate workspace is created automatically." : "Complétez le formulaire ci-dessous pour soumettre votre candidature. Votre espace candidat est créé automatiquement."}</p>

      <div className="mt-9 rounded-[30px] border bg-white p-6 shadow-soft md:p-10">
        {hasApplication ? (
          <div className="rounded-3xl bg-mint p-8 text-center">
            <h3 className="text-2xl font-black">{en ? "Your application is already registered" : "Votre candidature est déjà enregistrée"}</h3>
            <p className="mt-3 text-slate-600">{en ? "Open your candidate area to track it." : "Consultez votre espace candidat pour suivre son évolution."}</p>
            <Link href="/candidat" className="btn-primary mt-6">{en ? "View my application" : "Consulter ma candidature"}</Link>
          </div>
        ) : (
          <PublicApplicationForm kind={kind} jobOfferId={offer} locale={locale} initialProfile={initialProfile} />
        )}
      </div>
    </div>
  </main>;
}
