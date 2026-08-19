import { Suspense } from "react";
import { requireActivePlatformSession } from "@/lib/active-platform-session";
import ClientShell from "@/components/client/ClientShell";
import ChildGrowthWorkspace from "@/components/client/ChildGrowthWorkspace";
import {requireClient} from "@/lib/client";
import {getApplicableTax} from "@/lib/taxes";
import {getCurrentLocale} from "@/lib/i18n-server";
import {getChildGrowthPageSettings} from "@/lib/child-growth-page";

export default async function ChildGrowthPage(){
  await requireActivePlatformSession("child_growth","client");
  const {supabase,user,profile}=await requireClient();
  const locale=await getCurrentLocale(), now=new Date().toISOString();
  const settings=await getChildGrowthPageSettings();
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
  const premium=Boolean((subscriptions||[]).some((s:any)=>s.status==="active"&&String(s.subscription_plans?.tier||s.plan_id||"").toLowerCase().includes("premium")));const {data:careAccess}=await supabase.from("platform_service_access").select("service_key,active").eq("user_id",user.id).in("service_key",["teleconsultation","medical_consultation"]).eq("active",true);return <ClientShell email={user.email||""} service="child_growth"><Suspense fallback={null}><ChildGrowthWorkspace settings={settings} parentId={user.id} initialChildren={children||[]} initialMeasurements={measurements||[]} subscriptions={subscriptions||[]} plan={plan} taxRate={Number(tax.rate)} initialAnalyses={analyses||[]} initialAlerts={alerts||[]} initialReports={reports||[]} initialFeeding={feeding||[]} initialVaccinations={vaccinations||[]} growthStandards={growthStandards||[]} locale={locale} canRequestConsultation={premium||Boolean(careAccess?.length)}/></Suspense></ClientShell>
}
