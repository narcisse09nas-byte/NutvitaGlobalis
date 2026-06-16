import AdminShell from "@/components/admin/AdminShell";
import PayPalPayoutManager from "@/components/admin/PayPalPayoutManager";
import { requireAdmin } from "@/lib/admin";

export default async function PayPalPartnerPayoutPage() {
  const { supabase, admin } = await requireAdmin();
  const [{ data: partners }, { data: payouts }] = await Promise.all([
    supabase.from("dietitian_profiles").select("*").order("full_name"),
    supabase.from("partner_paypal_payouts").select("*, dietitian_profiles(full_name)").order("generated_at", { ascending: false }),
  ]);
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Paiements PayPal partenaires</h1><p className="mt-2 text-slate-500">Generation des versements partenaires via le compte PayPal NutVitaGlobalis.</p></div><PayPalPayoutManager partners={partners || []} payouts={payouts || []} adminId={admin.id} /></AdminShell>;
}
