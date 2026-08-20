import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicStaffApplicationForm from "@/components/staff-candidate/PublicStaffApplicationForm";

export const metadata = { title: "Postuler — Carrières NutVitaGlobalis" };

export default async function Page({ searchParams }: { searchParams: Promise<{ offer?: string }> }) {
  const { offer: offerId } = await searchParams;

  if (!hasSupabaseConfig() || !offerId) {
    return <main className="container-site py-24 text-center">
      <p className="text-lg font-bold">Cette candidature nécessite une offre valide.</p>
      <Link href="/carrieres" className="btn-primary mt-6 inline-flex">Voir les offres</Link>
    </main>;
  }

  const admin = createAdminClient();
  const { data: offer } = await admin.from("maximus_job_offers").select("id,reference,title,department,contract_type,location,status,closing_at").eq("id", offerId).maybeSingle();
  if (!offer || offer.status !== "published" || (offer.closing_at && new Date(offer.closing_at) < new Date())) {
    return <main className="container-site py-24 text-center">
      <p className="text-lg font-bold">Cette offre n'est plus disponible.</p>
      <Link href="/carrieres" className="btn-primary mt-6 inline-flex">Voir les offres</Link>
    </main>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let hasApplication = false;
  if (user) {
    const { data } = await supabase.from("maximus_staff_applications").select("id").eq("offer_id", offerId).eq("candidate_id", user.id).maybeSingle();
    hasApplication = Boolean(data);
  }
  const initialProfile = user ? { full_name: String(user.user_metadata?.full_name || ""), email: user.email || "", phone: String(user.user_metadata?.whatsapp_phone || user.user_metadata?.phone || "") } : null;

  return <main className="bg-[#fbfdfc] py-14">
    <div className="container-site max-w-4xl">
      <p className="text-xs font-black uppercase tracking-widest text-orange">{offer.reference}</p>
      <h1 className="mt-2 text-4xl font-black leading-tight">Postuler — {offer.title}</h1>
      <p className="mt-3 text-slate-500">{offer.department} · {offer.contract_type}{offer.location ? ` · ${offer.location}` : ""}</p>

      <div className="mt-9 rounded-[30px] border bg-white p-6 shadow-soft md:p-10">
        {hasApplication ? (
          <div className="rounded-3xl bg-mint p-8 text-center">
            <h3 className="text-2xl font-black">Votre candidature est déjà enregistrée</h3>
            <p className="mt-3 text-slate-600">Consultez votre espace candidat pour suivre son évolution.</p>
            <Link href="/staff-candidat" className="btn-primary mt-6">Consulter ma candidature</Link>
          </div>
        ) : (
          <PublicStaffApplicationForm offerId={offer.id} initialProfile={initialProfile} />
        )}
      </div>
    </div>
  </main>;
}
