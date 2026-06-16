import AdminShell from "@/components/admin/AdminShell";
import ExpenseManager from "@/components/admin/ExpenseManager";
import { requireAdmin } from "@/lib/admin";

export default async function ExpensesPage() {
  const { supabase, admin } = await requireAdmin();
  const { data } = await supabase.from("business_expenses").select("*").order("expense_date", { ascending: false });
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Depenses administratives</h1><p className="mt-2 text-slate-500">Domaine, emails, hebergement, logiciels, marketing, operations et autres charges NutVitaGlobalis.</p></div><ExpenseManager initial={data || []} adminId={admin.id} /></AdminShell>;
}
