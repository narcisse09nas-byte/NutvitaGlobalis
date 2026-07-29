import Link from "next/link";
import ClientShell from "@/components/client/ClientShell";
import {getClientEntitlements,requireClient} from "@/lib/client";
import {getCurrentLocale} from "@/lib/i18n-server";
import {pickLocalized} from "@/lib/i18n";
import {redirect} from "next/navigation";

export default async function ClientPremiumResourcesPage(){
  const {supabase,user}=await requireClient();
  const [access,locale]=await Promise.all([getClientEntitlements(supabase,user.id),getCurrentLocale()]);
  if(!access.premiumResources)redirect("/espace-client/services?acces=ressources-premium-requis");
  const {data}=await supabase.from("ressources_premium").select("id,title,title_en,description,description_en,image_url,created_at").eq("status","published").order("created_at",{ascending:false});
  const en=locale==="en";
  return <ClientShell email={user.email||""} service="client"><div className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-orange">{en?"Subscriber benefits":"Avantages abonnés"}</p><h1 className="mt-2 text-3xl font-black">{en?"My premium resources":"Mes ressources premium"}</h1><p className="mt-2 text-slate-500">{en?"Resources included with your active premium service.":"Ressources incluses avec votre service premium actif."}</p></div><div className="grid gap-5 md:grid-cols-2">{(data||[]).map((item:any)=><article key={item.id} className="card p-6"><h2 className="text-xl font-black text-forest">{pickLocalized(item,"title",locale)}</h2><p className="mt-3 leading-6 text-slate-600">{pickLocalized(item,"description",locale)}</p><Link className="btn-primary mt-5" href={`/api/premium-resources/${item.id}`}>{en?"Open resource":"Ouvrir la ressource"}</Link></article>)}{!data?.length&&<p className="rounded-2xl bg-white p-8 text-slate-500">{en?"No premium resource is currently published.":"Aucune ressource premium n’est publiée actuellement."}</p>}</div></ClientShell>
}
