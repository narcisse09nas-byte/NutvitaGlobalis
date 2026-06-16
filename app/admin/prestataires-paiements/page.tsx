import AdminShell from "@/components/admin/AdminShell";
import PartnerPayoutManager from "@/components/admin/PartnerPayoutManager";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const [{ data: partners }, { data: payouts }] = await Promise.all([
    supabase.from("dietitian_profiles").select("*").order("full_name"),
    supabase.from("partner_payouts").select("*, dietitian_profiles(full_name)").order("created_at", { ascending: false }),
  ]);
  return <AdminShell name={admin.full_name || admin.email}>
    <div className="mb-7"><h1 className="text-3xl font-black">Paiements aux prestataires</h1><p className="mt-2 text-slate-500">Historique des versements aux partenaires. Pour generer un paiement PayPal, utilisez la page dediee PayPal partenaires.</p></div>
    <PartnerPayoutManager partners={partners || []} payouts={payouts || []} />
  </AdminShell>;
}
