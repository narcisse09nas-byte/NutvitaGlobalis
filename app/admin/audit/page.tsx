import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Audit et tracabilite</h1><p className="mt-2 text-slate-500">Connexions, modifications, paiements, consultations, suppressions et creation d'utilisateurs.</p></div><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-4">Date</th><th className="p-4">Acteur</th><th className="p-4">Action</th><th className="p-4">Ressource</th><th className="p-4">Details</th></tr></thead><tbody>{data?.map((row: any) => <tr key={row.id} className="border-t"><td className="p-4">{new Date(row.created_at).toLocaleString("fr-FR")}</td><td className="p-4">{row.actor_id || "systeme"}</td><td className="p-4 font-bold">{row.action}</td><td className="p-4">{row.resource_type} {row.resource_id || ""}</td><td className="p-4 text-xs text-slate-500">{JSON.stringify(row.metadata || {})}</td></tr>)}</tbody></table></div></AdminShell>;
}
