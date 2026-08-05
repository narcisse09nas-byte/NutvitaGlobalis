import ClientShell from "@/components/client/ClientShell";
import ServiceCatalog from "@/components/client/ServiceCatalogV2";
import {requireClient} from "@/lib/client";
import {getAccessChoices} from "@/lib/platform-access";
import {getCurrentLocale} from "@/lib/i18n-server";
import {getClientServiceCatalog} from "@/lib/client-service-catalog";

export default async function ServicesPage(){
 const{supabase,user}=await requireClient();
 const[access,settings,locale,{data:plans},{data:children},{data:subscriptions}]=await Promise.all([
  getAccessChoices(),getClientServiceCatalog(),getCurrentLocale(),
  supabase.from("subscription_plans").select("*").eq("active",true).order("service_type").order("tier"),
  supabase.from("children").select("id,first_name,last_name").eq("parent_id",user.id).order("created_at",{ascending:false}),
  supabase.from("subscriptions").select("id,plan_id,status,expires_at,child_id").eq("client_id",user.id).in("status",["active","pending"]).order("created_at",{ascending:false}),
 ]);
 const english=locale==="en",t=(fr:string,en:string)=>english?(en||fr):fr;
 return <ClientShell email={user.email||""}><div className="mb-8"><h1 className="text-4xl font-black text-forest">{t(settings.heading,settings.heading_en)}</h1><p className="mt-3 max-w-4xl leading-7 text-slate-600">{t(settings.intro,settings.intro_en)}</p></div><ServiceCatalog settings={settings} plans={plans||[]} children={children||[]} subscriptions={subscriptions||[]} choices={access.choices.map(({service,role})=>({service,role}))} english={english}/></ClientShell>;
}