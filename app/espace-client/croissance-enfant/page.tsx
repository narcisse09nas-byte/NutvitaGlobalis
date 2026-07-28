import ClientShell from "@/components/client/ClientShell";
import ChildGrowthCenter from "@/components/client/ChildGrowthCenter";
import {requireClient} from "@/lib/client";
import {getApplicableTax} from "@/lib/taxes";
import {getCurrentLocale} from "@/lib/i18n-server";

export default async function ChildGrowthPage(){
  const {supabase,user,profile}=await requireClient();
  const locale=await getCurrentLocale(), now=new Date().toISOString();
  const {data:children}=await supabase.from("children").select("*").eq("parent_id",user.id).eq("active",true).order("created_at");
  const childIds=(children||[]).map((child:any)=>child.id);
  const childQuery=(table:string,order:string)=>childIds.length
    ? supabase.from(table).select("*").in("child_id",childIds).order(order,{ascending:false})
    : Promise.resolve({data:[]});
  const [{data:measurements},{data:subscriptions},{data:plan},{data:analyses},{data:alerts},{data:reports},{data:feeding},{data:vaccinations},tax]=await Promise.all([
    childIds.length?supabase.from("child_growth_measurements").select("*").in("child_id",childIds).order("measured_at"):Promise.resolve({data:[]}),
    supabase.from("subscriptions").select("*, subscription_plans(service_type)").eq("client_id",user.id).eq("status","active").gt("expires_at",now),
    supabase.from("subscription_plans").select("*").eq("id","child-growth-yearly").eq("active",true).maybeSingle(),
    childQuery("child_growth_analyses","created_at"),childQuery("child_growth_alerts","created_at"),childQuery("child_growth_reports","created_at"),
    childQuery("child_feeding_assessments","assessed_at"),childQuery("child_vaccination_assessments","assessed_at"),
    getApplicableTax(supabase,profile?.country_code,"subscription")
  ]);
  const sexes=[...new Set((children||[]).map((child:any)=>child.sex).filter((sex:any)=>sex==="female"||sex==="male"))];
  const {data:growthStandards}=sexes.length?await supabase.from("who_growth_standards").select("indicator,sex,age_months,length_height_cm,measurement_method,l,m,s").in("sex",sexes).in("indicator",["weight_for_age","height_for_age","weight_for_height"]).order("age_months"):{data:[]};
  return <ClientShell email={user.email||""}><div className="mb-7"><h1 className="text-3xl font-black">{locale==="en"?"Child Growth Promotion Monitoring":"Suivi Promotion Croissance Enfant"}</h1><p className="mt-2 text-slate-500">{locale==="en"?"Add or select a child to open their strictly separated monitoring record.":"Ajoutez ou s\u00e9lectionnez un enfant pour ouvrir son dossier de suivi strictement cloisonn\u00e9."}</p></div><ChildGrowthCenter parentId={user.id} initialChildren={children||[]} initialMeasurements={measurements||[]} subscriptions={subscriptions||[]} plan={plan} taxRate={Number(tax.rate)} initialAnalyses={analyses||[]} initialAlerts={alerts||[]} initialReports={reports||[]} initialFeeding={feeding||[]} initialVaccinations={vaccinations||[]} growthStandards={growthStandards||[]} locale={locale}/></ClientShell>
}