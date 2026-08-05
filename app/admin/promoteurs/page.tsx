import AdminShell from "@/components/admin/AdminShell";
import PromoterManager from "@/components/admin/PromoterManager";
import { requireAdmin } from "@/lib/admin";

export default async function PromotersAdminPage() {
  const { supabase, admin } = await requireAdmin();
  const [{ data: promoters }, { data: balances }, { data: payouts }, { data: ledger }] = await Promise.all([
    supabase.from("promoter_profiles").select("*").eq("status", "active").order("full_name"),
    supabase.from("promoter_balances").select("*"),
    supabase.from("promoter_payouts").select("*, promoter_profiles(full_name,matricule)").order("created_at", { ascending: false }).limit(100),
    supabase.from("promoter_ledger").select("*, promoter_profiles(full_name,matricule)").order("created_at", { ascending: false }).limit(50),
  ]);
  return <AdminShell name={admin.full_name || admin.email}>
    <div className="mb-7">
      <h1 className="text-3xl font-black">Promoteurs</h1>
      <p className="mt-2 text-slate-500">Cagnotes, commissions et versements du programme de parrainage.</p>
    </div>
    <PromoterManager promoters={promoters || []} balances={balances || []} payouts={payouts || []} ledger={ledger || []} />
  </AdminShell>;
}
