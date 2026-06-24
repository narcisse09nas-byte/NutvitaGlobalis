import AdminShell from "@/components/admin/AdminShell";
import FosaRequestManager from "@/components/admin/FosaRequestManager";
import { requireAdmin } from "@/lib/admin";

export default async function Page(){
  const {supabase,admin}=await requireAdmin();
  const {data}=await supabase.from("fosa_organizations").select("*").order("created_at",{ascending:false});
  return <AdminShell name={admin.full_name||admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Acces au service FOSA</h1><p className="mt-2 text-slate-500">Validez les organisations avant l'ouverture de leur session administrateur FOSA.</p></div><FosaRequestManager initial={data||[]}/></AdminShell>
}
