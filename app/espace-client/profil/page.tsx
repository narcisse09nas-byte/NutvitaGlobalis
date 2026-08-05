import ClientProfileForm from "@/components/client/ClientProfileForm";
import ClientShell from "@/components/client/ClientShell";
import PromoCodeCard from "@/components/client/PromoCodeCard";
import { requireClient } from "@/lib/client";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function ClientProfilePage() {
  const { supabase, user, profile } = await requireClient();
  const locale=await getCurrentLocale(),en=locale==="en";
  const { data: referredPromoter } = profile?.referred_by_promoter_id
    ? await supabase.from("promoter_profiles").select("matricule").eq("id", profile.referred_by_promoter_id).maybeSingle()
    : { data: null };
  return <ClientShell email={user.email || ""}><div className="mb-7"><h1 className="text-3xl font-black">{en?"My health profile":"Mon profil sante"}</h1><p className="mt-2 text-slate-500">{en?"Personal information, medical history and allergies.":"Informations personnelles, antecedents et allergies."}</p></div><div className="grid gap-6"><ClientProfileForm userId={user.id} email={user.email || ""} initial={profile || {}} locale={locale}/><PromoCodeCard userId={user.id} referredByMatricule={referredPromoter?.matricule || null}/></div></ClientShell>;
}
