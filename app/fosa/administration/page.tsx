import FosaShell from "@/components/fosa/FosaShell";
import FosaAdminManager from "@/components/fosa/FosaAdminManager";
import { requireFosaAdmin } from "@/lib/fosa";

export default async function Page(){
  const {supabase,member,organization}=await requireFosaAdmin();
  const [{data:facilities},{data:members},{data:assignments}]=await Promise.all([supabase.from("fosa_facilities").select("*").eq("organization_id",organization.id).order("created_at"),supabase.from("fosa_members").select("*").eq("organization_id",organization.id).order("created_at"),supabase.from("fosa_member_facilities").select("*")]);
  return <FosaShell organization={organization.name} member={member}><div className="mb-7"><h1 className="text-3xl font-black">Administration FOSA</h1><p className="mt-2 text-slate-500">Creez les formations sanitaires, les comptes staff, leurs roles et leurs acces.</p></div><FosaAdminManager organizationId={organization.id} initialFacilities={facilities||[]} initialMembers={members||[]} assignments={assignments||[]}/></FosaShell>
}
