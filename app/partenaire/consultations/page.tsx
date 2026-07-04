import PartnerShell from "@/components/partner/PartnerShell";
import ConsultationManager from "@/components/partner/ConsultationManager";
import { requirePartner } from "@/lib/partner";

export default async function Page() {
  const { supabase, user, profile } = await requirePartner();
  const now = new Date().toISOString();
  const [{ data: consultations }, { data: clients }] = await Promise.all([
    supabase.from("partner_consultations").select("*, client_profiles(*)").eq("partner_id", profile.id).order("scheduled_at", { ascending: false }),
    supabase.from("client_profiles").select("*, children(id,full_name,birth_date,sex)").or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).gte("partner_access_expires_at", now).order("full_name"),
  ]);
  return (
    <PartnerShell email={user.email || ""}>
      <div className="mb-7">
        <h1 className="text-3xl font-black">Consultations</h1>
        <p className="mt-2 text-slate-500">Programmez uniquement avec les clients actifs, sans ressaisir de paiement.</p>
      </div>
      <ConsultationManager initial={consultations || []} clients={clients || []} partnerId={profile.id} />
    </PartnerShell>
  );
}
