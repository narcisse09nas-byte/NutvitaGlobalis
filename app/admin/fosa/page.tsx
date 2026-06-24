import AdminShell from "@/components/admin/AdminShell";
import FosaRequestManager from "@/components/admin/FosaRequestManager";
import { requireAdmin } from "@/lib/admin";

export default async function Page(){
  const {supabase,admin}=await requireAdmin();
  const [{data},{data:current}]=await Promise.all([supabase.from("fosa_organizations").select("*").order("created_at",{ascending:false}),supabase.from("admin_users").select("role").eq("id",admin.id).maybeSingle()]);
  return <AdminShell name={admin.full_name||admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Acces au service FOSA</h1><p className="mt-2 text-slate-500">Une demande approuvee est immediatement accessible au demandeur. Seules les demandes en attente exigent une decision.</p></div><FosaRequestManager initial={data||[]} canDelete={current?.role==="super_admin"}/></AdminShell>
}
