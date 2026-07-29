import ClientShell from "@/components/client/ClientShell";
import HealthTrendsDashboard from "@/components/client/HealthTrendsDashboardV2";
import { requireHealthAccess } from "@/lib/client";
import {getCurrentLocale} from "@/lib/i18n-server";
export default async function TrendsPage(){
  const {supabase,user}=await requireHealthAccess(),locale=await getCurrentLocale(),en=locale==="en";
  const [{data:anthropometry},{data:biology},{data:food},{data:wellness}]=await Promise.all([
    supabase.from("anthropometric_measurements").select("*").eq("client_id",user.id).order("measured_at"),
    supabase.from("biological_measurements").select("*").eq("client_id",user.id).order("measured_at"),
    supabase.from("food_history").select("*").eq("client_id",user.id).order("entry_date"),
    supabase.from("health_lifestyle_assessments").select("assessed_at,nutrition_score,physical_activity_score,lifestyle_score").eq("client_id",user.id).order("assessed_at")
  ]);
  return <ClientShell email={user.email||""}><div className="mb-7"><h1 className="text-3xl font-black">{en?"Health dashboards and trends":"Tableaux de bord et tendances"}</h1><p className="mt-2 text-slate-500">{en?"All recorded variables are displayed; use filters to customize the view.":"Toutes vos variables renseign\u00e9es sont visibles ; utilisez les filtres pour personnaliser l\u2019affichage."}</p></div><HealthTrendsDashboard anthropometry={anthropometry||[]} biology={biology||[]} food={food||[]} wellness={wellness||[]} locale={locale}/></ClientShell>
}