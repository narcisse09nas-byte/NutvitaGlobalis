import Link from "next/link";
import { redirect } from "next/navigation";
import FosaShell from "@/components/fosa/FosaShell";
import { fosaModules } from "@/lib/fosa-modules";
import { requireFosaMember } from "@/lib/fosa";

export default async function Page(){
  const {supabase,member,organization}=await requireFosaMember();
  if(member.status!=="active"||organization?.status!=="approved")return <FosaShell organization={organization?.name||"Demande FOSA"} member={member}><section className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center"><h1 className="text-3xl font-black">Demande en attente</h1><p className="mt-4 leading-7 text-slate-500">Votre compte est cree, mais l'acces au service sera ouvert apres validation par l'administration NutVitaGlobalis.</p><p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">Statut actuel : <b>{organization?.status||member.status}</b></p></section></FosaShell>;
  if(member.must_change_password)redirect("/mot-de-passe-oublie");
  const [{data:facilities},{data:records}]=await Promise.all([supabase.from("fosa_facilities").select("*").eq("organization_id",organization.id).eq("active",true),supabase.from("fosa_records").select("id,status").eq("organization_id",organization.id)]);
  return <FosaShell organization={organization.name} member={member}><div className="mb-7"><h1 className="text-3xl font-black">Tableau de bord FOSA</h1><p className="mt-2 text-slate-500">{facilities?.length||0} formation(s) sanitaire(s) visible(s), {records?.length||0} enregistrement(s).</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{fosaModules.map(module=><Link href={`/fosa/module/${module.slug}`} key={module.slug} className="rounded-2xl border bg-white p-6 transition hover:border-[#46878c] hover:shadow-soft"><h2 className="text-xl font-black">{module.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{module.description}</p></Link>)}</div></FosaShell>
}
