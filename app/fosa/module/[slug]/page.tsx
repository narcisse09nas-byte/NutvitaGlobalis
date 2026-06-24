import { notFound } from "next/navigation";
import FosaShell from "@/components/fosa/FosaShell";
import FosaRecordManager from "@/components/fosa/FosaRecordManager";
import { requireActiveFosaMember } from "@/lib/fosa";
import { getFosaModule } from "@/lib/fosa-modules";

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params,module=getFosaModule(slug);if(!module)notFound();
  const {supabase,member,organization}=await requireActiveFosaMember();
  const [{data:facilities},{data:records}]=await Promise.all([supabase.from("fosa_facilities").select("*").eq("organization_id",organization.id).eq("active",true).order("name"),supabase.from("fosa_records").select("*").eq("organization_id",organization.id).eq("module",module.slug).order("created_at",{ascending:false})]);
  return <FosaShell organization={organization.name} member={member}><div className="mb-7"><h1 className="text-3xl font-black">{module.title}</h1><p className="mt-2 text-slate-500">{module.description}</p></div><FosaRecordManager module={module} organizationId={organization.id} member={member} facilities={facilities||[]} initial={records||[]}/></FosaShell>
}
