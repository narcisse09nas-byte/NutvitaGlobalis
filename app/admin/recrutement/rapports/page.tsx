import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";

type ApplicationRow = { id: string; full_name: string | null; email: string; status: string; created_at: string; updated_at: string };
const stages = ["submitted", "invited_to_test", "test_completed", "invited_to_interview", "selected", "integrated"];

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const { data } = await supabase.from("recruitment_applications").select("id,full_name,email,status,created_at,updated_at").order("updated_at", { ascending: false });
  const applications = (data || []) as ApplicationRow[];
  return <AdminShell name={admin.full_name || admin.email}><div><h1 className="text-4xl font-black">Rapports de recrutement</h1><p className="mt-2 text-slate-500">Vue consolidée du parcours des nutritionnistes partenaires.</p><section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{stages.map(status => <article key={status} className="rounded-lg border bg-white p-5"><b className="text-3xl text-forest">{applications.filter(row => row.status === status).length}</b><p className="mt-2 break-words text-xs font-bold uppercase text-slate-500">{status.replaceAll("_", " ")}</p></article>)}</section><section className="mt-6 overflow-x-auto rounded-lg border bg-white p-5"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b"><th className="p-3">Candidat</th><th className="p-3">Statut</th><th className="p-3">Entrée</th><th className="p-3">Dernière évolution</th></tr></thead><tbody>{applications.map(row => <tr key={row.id} className="border-b"><td className="p-3"><b>{row.full_name}</b><small className="block text-slate-500">{row.email}</small></td><td className="p-3">{row.status}</td><td className="p-3">{new Date(row.created_at).toLocaleDateString("fr-FR")}</td><td className="p-3">{new Date(row.updated_at).toLocaleDateString("fr-FR")}</td></tr>)}</tbody></table></section></div></AdminShell>;
}