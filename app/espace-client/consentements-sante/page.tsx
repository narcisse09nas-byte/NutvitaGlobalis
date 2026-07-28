import ClientShell from "@/components/client/ClientShell";
import PrescriptionResultsCenter from "@/components/client/PrescriptionResultsCenter";
import { requireHealthAccess } from "@/lib/client";

export default async function HealthConsentsPage() {
  const { supabase, user, profile } = await requireHealthAccess();
  const partnerId = profile?.assigned_partner_id || profile?.created_by_partner_id || null;
  const { data: consents } = partnerId
    ? await supabase.from("professional_data_consents").select("*").eq("client_id", user.id).eq("partner_id", partnerId)
    : { data: [] };
  return <ClientShell email={user.email || ""}>
    <div className="mb-7"><h1 className="text-3xl font-black">Consentement de partage</h1><p className="mt-2 text-slate-500">Contrôlez précisément les informations accessibles à votre nutritionniste.</p></div>
    <PrescriptionResultsCenter view="consents" clientId={user.id} partnerId={partnerId} consultations={[]} initialResults={[]} initialConsents={consents || []}/>
  </ClientShell>;
}
