import PartnerShell from "@/components/partner/PartnerShell";
import PartnerClientManager from "@/components/partner/PartnerClientManager";
import { requirePartner } from "@/lib/partner";

export default async function Page() {
  const { supabase, user, profile } = await requirePartner();
  const { data } = await supabase.from("client_profiles").select("*").or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).order("created_at", { ascending: false });
  return (
    <PartnerShell email={user.email || ""}>
      <div className="mb-7">
        <h1 className="text-3xl font-black">Mes clients</h1>
        <p className="mt-2 text-slate-500">Clients crees sur site ou attribues par l'administration, avec statut lie au paiement.</p>
      </div>
      <PartnerClientManager initial={data || []} partnerId={profile.id} />
    </PartnerShell>
  );
}
